-- =============================================================================
-- Inversiones JP · Fase 8 · Dashboard y reportes
-- -----------------------------------------------------------------------------
--   · Funciones de solo lectura (security invoker: respetan RLS del que consulta) que
--     devuelven las filas de cada reporte con los filtros del panel. Los totales se
--     calculan en TypeScript (src/lib/reportes.ts) con fórmulas probadas.
--   · rep_kpis(): indicadores del inicio del panel en una sola consulta.
--   · Filtros: rango de fechas, tipo de crédito, asesor (credito.creado_por) y sucursal.
--     Un filtro null = todos.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

create index if not exists credito_desembolso_idx on public.credito (fecha_desembolso) where estado <> 'ANULADO';
create index if not exists credito_cancelacion_idx on public.credito (fecha_cancelacion) where estado = 'FINALIZADO_LIQUIDADO';
create index if not exists credito_creado_por_idx on public.credito (creado_por);

-- -----------------------------------------------------------------------------
-- Colocaciones: créditos desembolsados en el rango (sin anulados)
-- -----------------------------------------------------------------------------
drop function if exists public.rep_colocaciones(date, date, public.tipo_credito, uuid, uuid);
create function public.rep_colocaciones(
  p_desde date, p_hasta date, p_tipo public.tipo_credito default null, p_asesor uuid default null, p_sucursal uuid default null)
returns table (
  credito_id uuid, codigo text, tipo public.tipo_credito, fecha_desembolso date, cliente text, documento text,
  asesor text, sucursal text, monto_total numeric, cuota_inicial numeric, monto_financiado numeric,
  total_intereses numeric, monto_total_pagar numeric, numero_cuotas int, frecuencia public.frecuencia_pago,
  tasa_porcentaje numeric, estado public.estado_credito)
language sql stable security invoker set search_path = '' as $$
  select cr.id, cr.codigo, cr.tipo, cr.fecha_desembolso, cl.nombres || ' ' || cl.apellidos, cl.numero_documento,
         nullif(trim(coalesce(pu.nombres, '') || ' ' || coalesce(pu.apellidos, '')), ''), su.nombre,
         cr.monto_total, cr.cuota_inicial, cr.monto_financiado, cr.total_intereses, cr.monto_total_pagar,
         cr.numero_cuotas, cr.frecuencia, cr.tasa_porcentaje, cr.estado
  from public.credito cr
  join public.cliente cl on cl.id = cr.cliente_id
  left join public.perfil_usuario pu on pu.id = cr.creado_por
  left join public.sucursal su on su.id = cr.sucursal_id
  where cr.estado <> 'ANULADO'
    and cr.fecha_desembolso between p_desde and p_hasta
    and (p_tipo is null or cr.tipo = p_tipo)
    and (p_asesor is null or cr.creado_por = p_asesor)
    and (p_sucursal is null or cr.sucursal_id = p_sucursal)
  order by cr.fecha_desembolso, cr.codigo
$$;

-- -----------------------------------------------------------------------------
-- Cobranzas: pagos no anulados en el rango, separados en mora / interés / capital
-- -----------------------------------------------------------------------------
drop function if exists public.rep_cobranzas(date, date, public.tipo_credito, uuid, uuid);
create function public.rep_cobranzas(
  p_desde date, p_hasta date, p_tipo public.tipo_credito default null, p_asesor uuid default null, p_sucursal uuid default null)
returns table (
  pago_id uuid, numero_recibo bigint, fecha_pago date, codigo text, tipo public.tipo_credito, cliente text,
  metodo public.metodo_pago, numero_operacion text, registrado_por text, asesor text, sucursal text,
  monto numeric, mora numeric, interes numeric, capital numeric)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.numero_recibo, p.fecha_pago, cr.codigo, cr.tipo, cl.nombres || ' ' || cl.apellidos,
         p.metodo, p.numero_operacion,
         coalesce(nullif(trim(coalesce(cob.nombres, '') || ' ' || coalesce(cob.apellidos, '')), ''), 'Sistema anterior'),
         nullif(trim(coalesce(pu.nombres, '') || ' ' || coalesce(pu.apellidos, '')), ''), su.nombre,
         p.monto,
         coalesce(a.mora, 0), coalesce(a.interes, 0), coalesce(a.capital, 0)
  from public.pago p
  join public.credito cr on cr.id = p.credito_id
  join public.cliente cl on cl.id = cr.cliente_id
  left join public.perfil_usuario cob on cob.id = p.registrado_por
  left join public.perfil_usuario pu on pu.id = cr.creado_por
  left join public.sucursal su on su.id = cr.sucursal_id
  left join lateral (
    select sum(ap.mora) as mora, sum(ap.interes) as interes, sum(ap.capital) as capital
    from public.aplicacion_pago ap where ap.pago_id = p.id
  ) a on true
  where not p.anulado
    and p.fecha_pago between p_desde and p_hasta
    and (p_tipo is null or cr.tipo = p_tipo)
    and (p_asesor is null or cr.creado_por = p_asesor)
    and (p_sucursal is null or cr.sucursal_id = p_sucursal)
  order by p.fecha_pago, p.numero_recibo
$$;

-- -----------------------------------------------------------------------------
-- Mora: un registro por crédito con cuotas vencidas hoy (foto del día, sin rango)
-- -----------------------------------------------------------------------------
drop function if exists public.rep_mora(public.tipo_credito, uuid, uuid);
create function public.rep_mora(p_tipo public.tipo_credito default null, p_asesor uuid default null, p_sucursal uuid default null)
returns table (
  credito_id uuid, codigo text, tipo public.tipo_credito, cliente text, telefono text, asesor text, sucursal text,
  cuotas_vencidas int, primera_vencida date, dias_atraso int, tramo text, saldo_vencido numeric, mora_pendiente numeric,
  saldo_total numeric)
language sql stable security invoker set search_path = '' as $$
  with venc as (
    select cu.credito_id,
           count(*)::int as cuotas_vencidas,
           min(cu.fecha_vencimiento) as primera_vencida,
           sum(greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0)) as saldo_vencido,
           sum(cu.mora) as mora_pendiente
    from public.cuota cu
    where cu.estado <> 'PAGADA' and cu.fecha_vencimiento < public.hoy_lima()
      and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
    group by cu.credito_id
  )
  select cr.id, cr.codigo, cr.tipo, cl.nombres || ' ' || cl.apellidos, cl.telefono,
         nullif(trim(coalesce(pu.nombres, '') || ' ' || coalesce(pu.apellidos, '')), ''), su.nombre,
         v.cuotas_vencidas, v.primera_vencida, (public.hoy_lima() - v.primera_vencida)::int,
         case
           when public.hoy_lima() - v.primera_vencida <= 7  then 'MORA_1_7'
           when public.hoy_lima() - v.primera_vencida <= 15 then 'MORA_8_15'
           when public.hoy_lima() - v.primera_vencida <= 30 then 'MORA_16_30'
           else 'MORA_MAS_30'
         end,
         v.saldo_vencido, v.mora_pendiente,
         (select coalesce(sum(greatest(c2.monto_cuota + c2.mora - c2.monto_pagado, 0)), 0)
          from public.cuota c2 where c2.credito_id = cr.id and c2.estado <> 'PAGADA')
  from venc v
  join public.credito cr on cr.id = v.credito_id and cr.estado in ('VIGENTE', 'EN_MORA')
  join public.cliente cl on cl.id = cr.cliente_id
  left join public.perfil_usuario pu on pu.id = cr.creado_por
  left join public.sucursal su on su.id = cr.sucursal_id
  where (p_tipo is null or cr.tipo = p_tipo)
    and (p_asesor is null or cr.creado_por = p_asesor)
    and (p_sucursal is null or cr.sucursal_id = p_sucursal)
  order by 10 desc, cr.codigo
$$;

-- -----------------------------------------------------------------------------
-- Cancelados: créditos que terminaron de pagarse en el rango
-- -----------------------------------------------------------------------------
drop function if exists public.rep_cancelados(date, date, public.tipo_credito, uuid, uuid);
create function public.rep_cancelados(
  p_desde date, p_hasta date, p_tipo public.tipo_credito default null, p_asesor uuid default null, p_sucursal uuid default null)
returns table (
  credito_id uuid, codigo text, tipo public.tipo_credito, cliente text, asesor text, sucursal text,
  fecha_desembolso date, fecha_cancelacion date, dias_credito int, monto_financiado numeric, total_intereses numeric,
  total_pagado numeric, mora_cobrada numeric, cuotas_con_atraso int, numero_cuotas int)
language sql stable security invoker set search_path = '' as $$
  select cr.id, cr.codigo, cr.tipo, cl.nombres || ' ' || cl.apellidos,
         nullif(trim(coalesce(pu.nombres, '') || ' ' || coalesce(pu.apellidos, '')), ''), su.nombre,
         cr.fecha_desembolso, cr.fecha_cancelacion, (cr.fecha_cancelacion - cr.fecha_desembolso)::int,
         cr.monto_financiado, cr.total_intereses,
         coalesce((select sum(p.monto) from public.pago p where p.credito_id = cr.id and not p.anulado), 0),
         coalesce((select sum(ap.mora) from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id
                   where p.credito_id = cr.id and not p.anulado), 0),
         (select count(*)::int from public.cuota cu
          where cu.credito_id = cr.id and cu.fecha_pago is not null and cu.fecha_pago > cu.fecha_vencimiento),
         cr.numero_cuotas
  from public.credito cr
  join public.cliente cl on cl.id = cr.cliente_id
  left join public.perfil_usuario pu on pu.id = cr.creado_por
  left join public.sucursal su on su.id = cr.sucursal_id
  where cr.estado = 'FINALIZADO_LIQUIDADO'
    and cr.fecha_cancelacion between p_desde and p_hasta
    and (p_tipo is null or cr.tipo = p_tipo)
    and (p_asesor is null or cr.creado_por = p_asesor)
    and (p_sucursal is null or cr.sucursal_id = p_sucursal)
  order by cr.fecha_cancelacion, cr.codigo
$$;

-- -----------------------------------------------------------------------------
-- KPIs del inicio (una fila). "Cartera vigente" = saldo por cobrar (cuota + mora − pagado)
-- de los créditos activos; "en mora" = la parte ya vencida de ese saldo.
-- -----------------------------------------------------------------------------
drop function if exists public.rep_kpis();
create function public.rep_kpis()
returns table (
  hoy date, creditos_activos int, creditos_en_mora int, cartera_vigente numeric, saldo_vencido numeric,
  capital_pendiente numeric, colocado_mes numeric, creditos_mes int, cobrado_hoy numeric, pagos_hoy int,
  cobrado_mes numeric, interes_cobrado_mes numeric, mora_cobrada_mes numeric, capital_cobrado_mes numeric,
  intereses_pactados_activos numeric, intereses_cobrados_activos numeric)
language sql stable security invoker set search_path = '' as $$
  with h as (select public.hoy_lima() as hoy),
  m as (select date_trunc('month', hoy)::date as inicio from h),
  act as (select id, total_intereses, estado from public.credito where estado in ('VIGENTE', 'EN_MORA')),
  pend as (
    select cu.credito_id, cu.fecha_vencimiento, greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0) as saldo,
           cu.capital, cu.monto_cuota, cu.monto_pagado
    from public.cuota cu join act on act.id = cu.credito_id where cu.estado <> 'PAGADA'),
  pm as (select p.id, p.monto, p.fecha_pago from public.pago p, m where not p.anulado and p.fecha_pago >= m.inicio),
  apm as (select sum(ap.mora) as mora, sum(ap.interes) as interes, sum(ap.capital) as capital
          from public.aplicacion_pago ap join pm on pm.id = ap.pago_id)
  select h.hoy,
         (select count(*)::int from act),
         (select count(*)::int from act where estado = 'EN_MORA'),
         coalesce((select sum(saldo) from pend), 0),
         coalesce((select sum(saldo) from pend, h where pend.fecha_vencimiento < h.hoy), 0),
         -- capital que falta cobrar: capital de la cuota menos lo pagado que excede mora+interés no se conoce por cuota;
         -- se usa el capital de las aplicaciones (exacto) restado del capital pactado.
         coalesce((select sum(cu.capital) from public.cuota cu join act on act.id = cu.credito_id), 0)
           - coalesce((select sum(ap.capital) from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id and not p.anulado
                       join act on act.id = p.credito_id), 0),
         coalesce((select sum(cr.monto_financiado) from public.credito cr, m where cr.estado <> 'ANULADO' and cr.fecha_desembolso >= m.inicio), 0),
         (select count(*)::int from public.credito cr, m where cr.estado <> 'ANULADO' and cr.fecha_desembolso >= m.inicio),
         coalesce((select sum(monto) from pm where fecha_pago = h.hoy), 0),
         (select count(*)::int from pm where fecha_pago = h.hoy),
         coalesce((select sum(monto) from pm), 0),
         coalesce((select interes from apm), 0),
         coalesce((select mora from apm), 0),
         coalesce((select capital from apm), 0),
         coalesce((select sum(total_intereses) from act), 0),
         coalesce((select sum(ap.interes) from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id and not p.anulado
                   join act on act.id = p.credito_id), 0)
  from h
$$;

-- Solo el personal (las funciones son security invoker: además aplica RLS).
do $$
declare f text;
begin
  foreach f in array array[
    'public.rep_colocaciones(date, date, public.tipo_credito, uuid, uuid)',
    'public.rep_cobranzas(date, date, public.tipo_credito, uuid, uuid)',
    'public.rep_mora(public.tipo_credito, uuid, uuid)',
    'public.rep_cancelados(date, date, public.tipo_credito, uuid, uuid)',
    'public.rep_kpis()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
