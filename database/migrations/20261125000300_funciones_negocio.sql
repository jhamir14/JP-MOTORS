-- =============================================================================
-- Inversiones JP · Fase 1 · Funciones de negocio y vistas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Código correlativo del crédito: JP-PE-2026-000123 (PE = préstamo efectivo,
-- CV = crédito vehicular, CC = crédito celular). Se asigna solo si viene vacío.
-- -----------------------------------------------------------------------------
create or replace function public.tg_codigo_credito()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := format('JP-%s-%s-%s',
      case new.tipo when 'PRESTAMO_EFECTIVO' then 'PE' when 'CREDITO_VEHICULAR' then 'CV' else 'CC' end,
      to_char(new.fecha_desembolso, 'YYYY'),
      lpad(nextval('public.credito_codigo_seq')::text, 6, '0'));
  end if;
  return new;
end $$;

create trigger credito_codigo before insert on public.credito
  for each row execute function public.tg_codigo_credito();

-- -----------------------------------------------------------------------------
-- Al vender a crédito, la unidad queda reservada (y vuelve a stock si se anula).
-- -----------------------------------------------------------------------------
create or replace function public.tg_estado_unidad_por_credito()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'ANULADO' then
    update public.unidad_vehiculo set estado = 'EN_STOCK' where id = new.unidad_vehiculo_id and estado = 'VENDIDO_CREDITO';
    update public.unidad_celular  set estado = 'EN_STOCK' where id = new.unidad_celular_id  and estado = 'VENDIDO_CREDITO';
  else
    update public.unidad_vehiculo set estado = 'VENDIDO_CREDITO' where id = new.unidad_vehiculo_id and estado in ('EN_STOCK', 'RESERVADO');
    update public.unidad_celular  set estado = 'VENDIDO_CREDITO' where id = new.unidad_celular_id  and estado in ('EN_STOCK', 'RESERVADO');
  end if;
  return null;
end $$;

create trigger credito_estado_unidad after insert or update of estado, unidad_vehiculo_id, unidad_celular_id on public.credito
  for each row execute function public.tg_estado_unidad_por_credito();

-- -----------------------------------------------------------------------------
-- Recalcular estados (job diario): cuotas vencidas → EN_MORA, estado de cada
-- crédito, y perfil del cliente (estado, score 1–5, apto para préstamo).
--
-- Score = puntualidad de las cuotas ya pagadas (pagada a más tardar
-- `dias_gracia_mora` días después del vencimiento; ver tabla configuracion):
--   ≥95 % → 5 · ≥85 % → 4 · ≥70 % → 3 · ≥50 % → 2 · resto → 1.
-- Un cliente con cuotas vencidas hoy tiene como máximo 2.
-- -----------------------------------------------------------------------------
create or replace function public.recalcular_estados(p_fecha date default current_date, p_dias_gracia int default null)
returns table (cuotas_en_mora int, creditos_en_mora int, clientes_actualizados int)
language plpgsql security definer set search_path = '' as $$
declare
  v_cuotas int; v_creditos int; v_clientes int;
begin
  -- Días de tolerancia: parámetro explícito o configuracion.dias_gracia_mora (por defecto 3)
  p_dias_gracia := coalesce(p_dias_gracia,
    (select (valor #>> '{}')::int from public.configuracion where clave = 'dias_gracia_mora'), 3);
  -- 1) Cuotas
  update public.cuota c set estado = 'EN_MORA'
  where c.estado in ('PENDIENTE', 'PAGADA_PARCIAL') and c.fecha_vencimiento < p_fecha;
  get diagnostics v_cuotas = row_count;

  update public.cuota c set estado = case when c.monto_pagado > 0 then 'PAGADA_PARCIAL' else 'PENDIENTE' end::public.estado_cuota
  where c.estado = 'EN_MORA' and c.fecha_vencimiento >= p_fecha;

  -- 2) Créditos activos
  with resumen as (
    select cr.id,
           bool_and(cu.estado = 'PAGADA') as todo_pagado,
           bool_or(cu.estado = 'EN_MORA') as con_mora,
           max(cu.fecha_pago) as ultima_fecha_pago
    from public.credito cr join public.cuota cu on cu.credito_id = cr.id
    where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')
    group by cr.id
  )
  update public.credito cr set
    estado = case when r.todo_pagado then 'FINALIZADO_LIQUIDADO'
                  when r.con_mora then 'EN_MORA'
                  else 'VIGENTE' end::public.estado_credito,
    fecha_cancelacion = case when r.todo_pagado then coalesce(cr.fecha_cancelacion, r.ultima_fecha_pago) end
  from resumen r
  where r.id = cr.id and cr.estado <> 'REFINANCIADO';
  select count(*) into v_creditos from public.credito where estado = 'EN_MORA';

  -- 3) Clientes
  with puntualidad as (
    select cr.cliente_id,
           count(*) filter (where cu.estado = 'PAGADA') as pagadas,
           count(*) filter (where cu.estado = 'PAGADA' and cu.fecha_pago <= cu.fecha_vencimiento + p_dias_gracia) as a_tiempo
    from public.credito cr join public.cuota cu on cu.credito_id = cr.id
    where cr.estado <> 'ANULADO'
    group by cr.cliente_id
  ),
  creditos as (
    select cliente_id,
           bool_or(estado = 'EN_MORA') as en_mora,
           bool_or(estado in ('VIGENTE', 'APROBADO', 'REFINANCIADO')) as vigente,
           bool_or(estado = 'FINALIZADO_LIQUIDADO') as finalizado
    from public.credito where estado <> 'ANULADO'
    group by cliente_id
  ),
  calculo as (
    select cl.id,
           c.en_mora, c.vigente, c.finalizado,
           case
             when p.pagadas is null or p.pagadas = 0 then null
             else least(
               case when p.a_tiempo::numeric / p.pagadas >= 0.95 then 5
                    when p.a_tiempo::numeric / p.pagadas >= 0.85 then 4
                    when p.a_tiempo::numeric / p.pagadas >= 0.70 then 3
                    when p.a_tiempo::numeric / p.pagadas >= 0.50 then 2
                    else 1 end,
               case when c.en_mora then 2 else 5 end)
           end as score
    from public.cliente cl
    left join creditos c on c.cliente_id = cl.id
    left join puntualidad p on p.cliente_id = cl.id
    where cl.estado <> 'BLOQUEADO_LEGAL'
  )
  update public.cliente cl set
    score_interno = k.score,
    estado = case
      when k.en_mora then 'ACTIVO_EN_MORA'
      when k.vigente then 'ACTIVO_AL_DIA'
      when k.finalizado and k.score >= 4 then 'EXCELENTE_PAGADOR'
      when k.finalizado then 'ACTIVO_AL_DIA'
      else 'NUEVO' end::public.estado_cliente,
    apto_prestamo_efectivo = coalesce(k.finalizado and not k.en_mora and k.score >= 4, false)
  from calculo k
  where k.id = cl.id
    and (cl.score_interno is distinct from k.score
         or cl.estado is distinct from (case
              when k.en_mora then 'ACTIVO_EN_MORA'
              when k.vigente then 'ACTIVO_AL_DIA'
              when k.finalizado and k.score >= 4 then 'EXCELENTE_PAGADOR'
              when k.finalizado then 'ACTIVO_AL_DIA'
              else 'NUEVO' end::public.estado_cliente)
         or cl.apto_prestamo_efectivo is distinct from coalesce(k.finalizado and not k.en_mora and k.score >= 4, false));
  get diagnostics v_clientes = row_count;

  return query select v_cuotas, v_creditos, v_clientes;
end $$;

revoke execute on function public.recalcular_estados(date, int) from public, anon, authenticated;
-- Lo ejecuta el job diario (service_role) o un administrador mediante una server action.

-- -----------------------------------------------------------------------------
-- Vistas para el panel (security_invoker: respetan el RLS de quien consulta)
-- -----------------------------------------------------------------------------
create or replace view public.v_cobranza with (security_invoker = true) as
select
  cu.id                as cuota_id,
  cr.id                as credito_id,
  cr.codigo,
  cr.tipo,
  cl.id                as cliente_id,
  cl.nombres || ' ' || cl.apellidos as cliente,
  cl.telefono,
  cl.direccion,
  cu.numero,
  cr.numero_cuotas,
  cu.fecha_vencimiento,
  cu.monto_cuota,
  cu.monto_pagado,
  (cu.monto_cuota + cu.mora - cu.monto_pagado) as saldo_cuota,
  greatest(current_date - cu.fecha_vencimiento, 0) as dias_atraso,
  case
    when cu.fecha_vencimiento > current_date then 'POR_VENCER'
    when cu.fecha_vencimiento = current_date then 'VENCE_HOY'
    when current_date - cu.fecha_vencimiento <= 7  then 'MORA_1_7'
    when current_date - cu.fecha_vencimiento <= 15 then 'MORA_8_15'
    when current_date - cu.fecha_vencimiento <= 30 then 'MORA_16_30'
    else 'MORA_MAS_30'
  end as tramo
from public.cuota cu
join public.credito cr on cr.id = cu.credito_id
join public.cliente cl on cl.id = cr.cliente_id
where cu.estado <> 'PAGADA' and cr.estado in ('VIGENTE', 'EN_MORA');

create or replace view public.v_resumen_cartera with (security_invoker = true) as
select
  cr.tipo,
  count(*) filter (where cr.estado in ('VIGENTE', 'EN_MORA'))                 as creditos_activos,
  count(*) filter (where cr.estado = 'EN_MORA')                               as creditos_en_mora,
  count(*) filter (where cr.estado = 'FINALIZADO_LIQUIDADO')                  as creditos_finalizados,
  coalesce(sum(cr.monto_financiado) filter (where cr.estado <> 'ANULADO'), 0) as total_colocado,
  coalesce(sum(cr.total_intereses)  filter (where cr.estado <> 'ANULADO'), 0) as intereses_pactados,
  coalesce((select sum(cu.monto_cuota - least(cu.monto_pagado, cu.monto_cuota))
            from public.cuota cu join public.credito c2 on c2.id = cu.credito_id
            where c2.tipo = cr.tipo and c2.estado in ('VIGENTE', 'EN_MORA')), 0) as saldo_por_cobrar
from public.credito cr
group by cr.tipo;
