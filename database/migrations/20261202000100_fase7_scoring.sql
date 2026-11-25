-- =============================================================================
-- Inversiones JP · Fase 7 · Scoring de clientes
-- -----------------------------------------------------------------------------
--   · recalcular_estados(): el score (1–5) ahora considera, además de la puntualidad, el atraso máximo,
--     los bloqueos de celular / cortes de GPS, los créditos cancelados y la mora de hoy. Las reglas son las
--     mismas de frontend/src/lib/scoring.ts (calcularScore): si cambias una, cambia la otra.
--   · cliente_score: métricas del último cálculo (por qué el cliente tiene su puntaje). Tabla aparte para no
--     llenar audit_log con los cambios diarios de días de atraso.
--   · score_historial: cada cambio de puntaje o de estado del cliente (trigger sobre cliente), con su motivo.
--   · configuracion.beneficios_score: beneficios para el siguiente financiamiento (inicial, tasa, cuotas) y
--     alertas por score bajo o mora vigente. Se editan en /admin/tasas.
--   · credito.beneficio_score: beneficio aplicado al registrar el crédito (queda congelado).
--   · Se elimina cliente.apto_prestamo_efectivo: la empresa no otorga préstamos en efectivo.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table if not exists public.cliente_score (
  cliente_id   uuid primary key references public.cliente (id) on delete cascade,
  puntaje      smallint check (puntaje between 1 and 5),
  base         smallint check (base between 1 and 5),
  metricas     jsonb not null,
  motivo       text not null,
  calculado_at timestamptz not null default now()
);
create index if not exists cliente_score_puntaje_idx on public.cliente_score (puntaje);

create table if not exists public.score_historial (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.cliente (id) on delete cascade,
  puntaje          smallint check (puntaje between 1 and 5),
  puntaje_anterior smallint check (puntaje_anterior between 1 and 5),
  estado           public.estado_cliente not null,
  estado_anterior  public.estado_cliente,
  motivo           text not null,
  metricas         jsonb,
  usuario_id       uuid references auth.users (id),
  created_at       timestamptz not null default now()
);
create index if not exists score_historial_cliente_idx on public.score_historial (cliente_id, created_at desc);

alter table public.cliente_score enable row level security;
alter table public.score_historial enable row level security;
revoke all on public.cliente_score, public.score_historial from anon, authenticated;
-- Solo lectura para el personal: se escriben desde recalcular_estados() y el trigger (security definer).
grant select on public.cliente_score, public.score_historial to authenticated;
drop policy if exists "personal lee score" on public.cliente_score;
create policy "personal lee score" on public.cliente_score for select to authenticated using ((select public.es_personal()));
drop policy if exists "personal lee historial de score" on public.score_historial;
create policy "personal lee historial de score" on public.score_historial for select to authenticated using ((select public.es_personal()));

alter table public.credito add column if not exists beneficio_score jsonb;
comment on column public.credito.beneficio_score is
  'Beneficio por score aplicado al registrar el crédito: {nivel, score, descuentoTasaPct, reduccionInicialPct, cuotasExtra}. null = sin beneficio';

-- -----------------------------------------------------------------------------
-- Configuración de beneficios (privada)
-- -----------------------------------------------------------------------------
insert into public.configuracion (clave, valor, descripcion, publica) values
  ('beneficios_score', jsonb_build_object(
      'activo', true,
      'niveles', jsonb_build_array(
        jsonb_build_object('scoreMin', 5, 'nombre', 'Cliente excelente', 'descuentoTasaPct', 10, 'reduccionInicialPct', 50, 'cuotasExtra', 4),
        jsonb_build_object('scoreMin', 4, 'nombre', 'Cliente puntual', 'descuentoTasaPct', 5, 'reduccionInicialPct', 25, 'cuotasExtra', 2)),
      'requiereCreditoCancelado', true,
      'alertaScoreMax', 2,
      'bloquearConMora', true),
   'Beneficios del siguiente financiamiento según el score del cliente, y alertas por score bajo o mora vigente', false)
on conflict (clave) do nothing;

-- -----------------------------------------------------------------------------
-- Historial: cada cambio de puntaje o de estado del cliente
-- -----------------------------------------------------------------------------
create or replace function public.tg_score_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_motivo text; v_metricas jsonb;
begin
  if new.score_interno is not distinct from old.score_interno and new.estado is not distinct from old.estado then
    return null;
  end if;
  select cs.motivo, cs.metricas into v_motivo, v_metricas from public.cliente_score cs where cs.cliente_id = new.id;
  if new.estado = 'BLOQUEADO_LEGAL' and old.estado is distinct from 'BLOQUEADO_LEGAL' then
    v_motivo := 'Bloqueo legal registrado en el panel';
  elsif old.estado = 'BLOQUEADO_LEGAL' and new.estado is distinct from 'BLOQUEADO_LEGAL' then
    v_motivo := 'Bloqueo legal levantado';
  end if;
  insert into public.score_historial (cliente_id, puntaje, puntaje_anterior, estado, estado_anterior, motivo, metricas, usuario_id)
  values (new.id, new.score_interno, old.score_interno, new.estado, old.estado, coalesce(v_motivo, 'Recalculado'), v_metricas, (select auth.uid()));
  return null;
end $$;
revoke execute on function public.tg_score_historial() from public, anon, authenticated;

drop trigger if exists cliente_score_historial on public.cliente;
create trigger cliente_score_historial after update of score_interno, estado on public.cliente
  for each row execute function public.tg_score_historial();

-- -----------------------------------------------------------------------------
-- Recalcular estados (job diario y después de cada pago / crédito)
-- Pasos 0–2 iguales a la Fase 5; el 3 (clientes) calcula el score nuevo.
-- -----------------------------------------------------------------------------
create or replace function public.recalcular_estados(p_fecha date default null, p_dias_gracia int default null)
returns table (cuotas_en_mora int, creditos_en_mora int, clientes_actualizados int)
language plpgsql security definer set search_path = '' as $$
declare
  v_cuotas int; v_creditos int; v_clientes int;
begin
  p_fecha := coalesce(p_fecha, public.hoy_lima());
  p_dias_gracia := coalesce(p_dias_gracia,
    (select (valor #>> '{}')::int from public.configuracion where clave = 'dias_gracia_mora'), 3);

  -- 0) Mora del día
  perform public.actualizar_mora(p_fecha);

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
  where r.id = cr.id and cr.estado <> 'REFINANCIADO'
    and cr.estado is distinct from (case when r.todo_pagado then 'FINALIZADO_LIQUIDADO'
                                         when r.con_mora then 'EN_MORA' else 'VIGENTE' end::public.estado_credito);
  select count(*) into v_creditos from public.credito where estado = 'EN_MORA';

  -- 3a) Métricas y score de cada cliente (excepto los de bloqueo legal)
  with cuotas as (
    select cr.cliente_id,
           cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') as credito_activo,
           cu.estado,
           case when cu.estado = 'PAGADA' and cu.fecha_pago is not null
                then greatest(cu.fecha_pago - cu.fecha_vencimiento, 0) end as atraso_pagada,
           case when cu.estado <> 'PAGADA' and cu.fecha_vencimiento < p_fecha
                then p_fecha - cu.fecha_vencimiento end as atraso_vencida
    from public.credito cr join public.cuota cu on cu.credito_id = cr.id
    where cr.estado <> 'ANULADO'
  ),
  por_cuotas as (
    select cliente_id,
           count(*) filter (where estado = 'PAGADA')::int as pagadas,
           count(*) filter (where atraso_pagada <= p_dias_gracia)::int as a_tiempo,
           coalesce(round(avg(atraso_pagada), 1), 0) as atraso_promedio,
           coalesce(greatest(max(atraso_pagada), max(atraso_vencida)), 0)::int as atraso_maximo,
           count(*) filter (where atraso_vencida is not null and credito_activo)::int as cuotas_mora_hoy,
           coalesce(max(atraso_vencida) filter (where credito_activo), 0)::int as dias_mora_hoy
    from cuotas group by cliente_id
  ),
  por_creditos as (
    select cliente_id,
           count(*) filter (where estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO'))::int as activos,
           count(*) filter (where estado = 'FINALIZADO_LIQUIDADO')::int as cancelados,
           count(*) filter (where estado = 'ANULADO')::int as anulados,
           min(fecha_desembolso) filter (where estado <> 'ANULADO') as primera,
           bool_or(estado = 'EN_MORA') as en_mora,
           bool_or(estado in ('VIGENTE', 'APROBADO', 'REFINANCIADO')) as vigente,
           bool_or(estado = 'FINALIZADO_LIQUIDADO') as finalizado
    from public.credito group by cliente_id
  ),
  bloqueos as (
    select cr.cliente_id, count(*)::int as n
    from public.evento_bloqueo e join public.credito cr on cr.id = e.credito_id
    where cr.estado <> 'ANULADO' and e.accion in ('BLOQUEAR', 'CORTAR_GPS')
    group by cr.cliente_id
  ),
  metricas as (
    select cl.id as cliente_id,
           coalesce(q.pagadas, 0) as pagadas, coalesce(q.a_tiempo, 0) as a_tiempo,
           coalesce(q.atraso_promedio, 0) as atraso_promedio, coalesce(q.atraso_maximo, 0) as atraso_maximo,
           coalesce(q.cuotas_mora_hoy, 0) as cuotas_mora_hoy, coalesce(q.dias_mora_hoy, 0) as dias_mora_hoy,
           coalesce(c.activos, 0) as activos, coalesce(c.cancelados, 0) as cancelados, coalesce(c.anulados, 0) as anulados,
           case when c.primera is null then 0
                else (extract(year from age(p_fecha, c.primera)) * 12 + extract(month from age(p_fecha, c.primera)))::int end as antiguedad,
           coalesce(b.n, 0) as bloqueos,
           coalesce(c.en_mora, false) as en_mora, coalesce(c.vigente, false) as vigente, coalesce(c.finalizado, false) as finalizado
    from public.cliente cl
    left join por_cuotas q on q.cliente_id = cl.id
    left join por_creditos c on c.cliente_id = cl.id
    left join bloqueos b on b.cliente_id = cl.id
    where cl.estado <> 'BLOQUEADO_LEGAL'
  ),
  base as (
    select m.*,
           case
             when m.pagadas > 0 then
               case when m.a_tiempo::numeric / m.pagadas >= 0.95 then 5
                    when m.a_tiempo::numeric / m.pagadas >= 0.85 then 4
                    when m.a_tiempo::numeric / m.pagadas >= 0.70 then 3
                    when m.a_tiempo::numeric / m.pagadas >= 0.50 then 2
                    else 1 end
             when m.cuotas_mora_hoy > 0 then 1
           end as base,
           (case when m.atraso_maximo > 30 then -1 else 0 end)
           + (case when m.bloqueos > 0 then -1 else 0 end)
           + (case when m.cancelados >= 2 and m.atraso_promedio <= p_dias_gracia and m.cuotas_mora_hoy = 0 then 1 else 0 end) as ajuste,
           case when m.cuotas_mora_hoy = 0 then 5 when m.dias_mora_hoy > 30 then 1 else 2 end as tope
    from metricas m
  ),
  calculo as (
    select b.*,
           case when b.base is not null then least(greatest(b.base + b.ajuste, 1), 5, b.tope) end as score,
           concat_ws(' · ',
             case when b.pagadas > 0 then format('%s %% de cuotas a tiempo (%s de %s)', round(b.a_tiempo * 100.0 / b.pagadas, 1), b.a_tiempo, b.pagadas)
                  when b.cuotas_mora_hoy > 0 then 'Sin cuotas pagadas y con cuotas vencidas'
                  else 'Sin historial de pagos' end,
             case when b.atraso_maximo > 30 then format('atraso máximo de %s días', b.atraso_maximo) end,
             case when b.bloqueos > 0 then format('%s bloqueo(s) o corte(s) de GPS', b.bloqueos) end,
             case when b.cancelados >= 2 and b.atraso_promedio <= p_dias_gracia and b.cuotas_mora_hoy = 0
                  then format('%s créditos cancelados a tiempo', b.cancelados) end,
             case when b.cuotas_mora_hoy > 0 then format('%s cuota(s) vencida(s) hoy, %s días de mora', b.cuotas_mora_hoy, b.dias_mora_hoy) end
           ) as motivo
    from base b
  )
  insert into public.cliente_score as cs (cliente_id, puntaje, base, metricas, motivo, calculado_at)
  select k.cliente_id, k.score, k.base,
         jsonb_build_object(
           'pagadas', k.pagadas, 'a_tiempo', k.a_tiempo, 'atraso_promedio', k.atraso_promedio, 'atraso_maximo', k.atraso_maximo,
           'cuotas_mora_hoy', k.cuotas_mora_hoy, 'dias_mora_hoy', k.dias_mora_hoy, 'creditos_activos', k.activos,
           'creditos_cancelados', k.cancelados, 'creditos_anulados', k.anulados, 'antiguedad_meses', k.antiguedad,
           'bloqueos', k.bloqueos, 'dias_gracia', p_dias_gracia,
           'en_mora', k.en_mora, 'vigente', k.vigente, 'finalizado', k.finalizado),
         k.motivo, now()
  from calculo k
  on conflict (cliente_id) do update set
    puntaje = excluded.puntaje, base = excluded.base, metricas = excluded.metricas,
    motivo = excluded.motivo, calculado_at = excluded.calculado_at;

  -- 3b) Estado y score del cliente (el trigger guarda el cambio en score_historial)
  with nuevo as (
    select cs.cliente_id as id, cs.puntaje as score,
           case
             when (cs.metricas ->> 'en_mora')::boolean then 'ACTIVO_EN_MORA'
             when (cs.metricas ->> 'vigente')::boolean then 'ACTIVO_AL_DIA'
             when (cs.metricas ->> 'finalizado')::boolean and cs.puntaje >= 4 then 'EXCELENTE_PAGADOR'
             when (cs.metricas ->> 'finalizado')::boolean then 'ACTIVO_AL_DIA'
             else 'NUEVO' end::public.estado_cliente as estado
    from public.cliente_score cs
    join public.cliente cl on cl.id = cs.cliente_id
    where cl.estado <> 'BLOQUEADO_LEGAL'
  )
  update public.cliente cl set score_interno = n.score, estado = n.estado
  from nuevo n
  where n.id = cl.id
    and (cl.score_interno is distinct from n.score or cl.estado is distinct from n.estado);
  get diagnostics v_clientes = row_count;

  return query select v_cuotas, v_creditos, v_clientes;
end $$;
revoke execute on function public.recalcular_estados(date, int) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- En desuso: la empresa no otorga préstamos en efectivo
-- -----------------------------------------------------------------------------
alter table public.cliente drop column if exists apto_prestamo_efectivo;

-- -----------------------------------------------------------------------------
-- Poner al día con las reglas nuevas y dejar el punto de partida del historial
-- -----------------------------------------------------------------------------
select public.recalcular_estados();

insert into public.score_historial (cliente_id, puntaje, estado, motivo, metricas)
select cl.id, cl.score_interno, cl.estado, 'Puntaje al activar el historial · ' || coalesce(cs.motivo, 'sin cálculo'), cs.metricas
from public.cliente cl
left join public.cliente_score cs on cs.cliente_id = cl.id
where not exists (select 1 from public.score_historial h where h.cliente_id = cl.id);
