-- =============================================================================
-- Inversiones JP · Fase 5 · Pagos y cobranzas
-- -----------------------------------------------------------------------------
--   · Pagos con voucher privado (voucher_pago, bytea; solo se descarga por /api/vouchers con sesión y auditoría).
--   · Cada pago se reparte por cuota en orden de vencimiento: mora → interés → capital (aplicacion_pago).
--     La base recalcula cuota.monto_pagado / estado / fecha_pago a partir de las aplicaciones de pagos
--     NO anulados, de modo que anular un pago revierte su efecto automáticamente.
--   · Mora: penalidad_diaria del crédito × días de atraso que pasan los días de gracia
--     (configuracion.dias_gracia_mora), opcionalmente con tope (% de la cuota). La calcula actualizar_mora(),
--     que también llama recalcular_estados() (job diario).
--   · proceso_diario(): ejecuta recalcular_estados() una vez por día (hora de Lima).
--   · Anulación de pagos (solo admins, con motivo); recibo correlativo por pago.
--   · Cierre de caja por usuario y día: los totales los calcula la base, no el navegador.
--   · Eventos de bloqueo de celular / corte de GPS (registro manual) que actualizan el estado de la unidad.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

-- Fecha de hoy en Lima (el servidor de la base trabaja en UTC).
create or replace function public.hoy_lima()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Lima')::date
$$;

-- -----------------------------------------------------------------------------
-- Parámetros
-- -----------------------------------------------------------------------------
insert into public.configuracion (clave, valor, descripcion, publica) values
  ('mora_tope_porcentaje_cuota', 'null'::jsonb,
   'Tope de la mora de una cuota, en % del valor de la cuota (ej. 50). null = sin tope', false),
  ('proceso_diario_fecha', 'null'::jsonb,
   'Último día (AAAA-MM-DD, Lima) en que se ejecutó el cálculo diario de mora y estados', false)
on conflict (clave) do nothing;

update public.configuracion
set descripcion = 'Días de tolerancia tras el vencimiento: no generan mora y la cuota cuenta como pagada a tiempo (score). Desde el día siguiente se cobra la penalidad diaria del crédito.'
where clave = 'dias_gracia_mora';

-- -----------------------------------------------------------------------------
-- Pagos: anulación auditada y n.º de recibo correlativo
-- -----------------------------------------------------------------------------
alter table public.pago add column if not exists anulado_por uuid references auth.users (id);
alter table public.pago add column if not exists anulado_at  timestamptz;

create sequence if not exists public.pago_recibo_seq;
alter table public.pago add column if not exists numero_recibo bigint;
do $$
begin
  if exists (select 1 from public.pago where numero_recibo is null) then
    -- Numerar los pagos existentes no es un cambio de negocio: sin auditoría fila por fila.
    alter table public.pago disable trigger pago_auditoria;
    update public.pago p set numero_recibo = o.n
    from (select id, nextval('public.pago_recibo_seq') as n
          from (select id from public.pago where numero_recibo is null order by fecha_pago, created_at, id) s) o
    where o.id = p.id;
    alter table public.pago enable trigger pago_auditoria;
  end if;
end $$;
alter table public.pago alter column numero_recibo set default nextval('public.pago_recibo_seq');
alter table public.pago alter column numero_recibo set not null;
create unique index if not exists pago_numero_recibo_key on public.pago (numero_recibo);
create index if not exists pago_registrado_por_idx on public.pago (registrado_por, fecha_pago);

-- -----------------------------------------------------------------------------
-- Vouchers (fotos o PDF del comprobante de Yape, Plin, transferencia…): privados
-- -----------------------------------------------------------------------------
create table if not exists public.voucher_pago (
  id          uuid primary key default gen_random_uuid(),
  pago_id     uuid not null unique references public.pago (id) on delete cascade,
  nombre      text not null,
  tipo_mime   text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  tamano      int not null check (tamano > 0 and tamano <= 8 * 1024 * 1024),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  datos       bytea not null,
  subido_por  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
alter table public.voucher_pago enable row level security;
revoke all on public.voucher_pago from anon, authenticated;
-- El personal ve que existe, pero los bytes solo se leen desde /api/vouchers (con sesión y auditoría).
grant select (id, pago_id, nombre, tipo_mime, tamano, sha256, subido_por, created_at) on public.voucher_pago to authenticated;
grant insert on public.voucher_pago to authenticated;

drop policy if exists "personal lee vouchers" on public.voucher_pago;
create policy "personal lee vouchers" on public.voucher_pago
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "personal sube vouchers" on public.voucher_pago;
create policy "personal sube vouchers" on public.voucher_pago
  for insert to authenticated with check ((select public.es_personal()) and subido_por = (select auth.uid()));

drop trigger if exists voucher_pago_auditoria on public.voucher_pago;
create trigger voucher_pago_auditoria after insert or update or delete on public.voucher_pago
  for each row execute function public.tg_auditar_sin_datos();

-- -----------------------------------------------------------------------------
-- Estado de una cuota a partir de las aplicaciones de pagos vigentes
-- -----------------------------------------------------------------------------
create or replace function public.recalcular_cuota(p_cuota uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c   public.cuota%rowtype;
  v_mora numeric; v_interes numeric; v_capital numeric; v_fecha date;
  v_pagado numeric;
begin
  select * into c from public.cuota where id = p_cuota for update;
  if not found then return; end if;

  select coalesce(sum(ap.mora), 0), coalesce(sum(ap.interes), 0), coalesce(sum(ap.capital), 0), max(p.fecha_pago)
    into v_mora, v_interes, v_capital, v_fecha
  from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id
  where ap.cuota_id = p_cuota and not p.anulado;

  if v_interes > c.interes + 0.004 or v_capital > c.capital + 0.004 then
    raise exception 'El pago excede lo pendiente de la cuota N.° % (interés o capital)', c.numero using errcode = 'P0001';
  end if;
  if v_mora > c.mora + 0.004 then
    raise exception 'El pago excede la mora de la cuota N.° %', c.numero using errcode = 'P0001';
  end if;

  v_pagado := v_mora + v_interes + v_capital;
  update public.cuota set
    monto_pagado = v_pagado,
    estado = case
      when v_pagado >= monto_cuota + mora - 0.004 then 'PAGADA'
      when fecha_vencimiento < public.hoy_lima() then 'EN_MORA'
      when v_pagado > 0 then 'PAGADA_PARCIAL'
      else 'PENDIENTE' end::public.estado_cuota,
    fecha_pago = case when v_pagado >= monto_cuota + mora - 0.004 then v_fecha end
  where id = p_cuota;
end $$;
revoke execute on function public.recalcular_cuota(uuid) from public, anon, authenticated;

-- Estado de un crédito a partir de sus cuotas (vigente / en mora / cancelado).
create or replace function public.recalcular_credito(p_credito uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_credito; v_todo boolean; v_mora boolean; v_ultima date;
begin
  select estado into v_estado from public.credito where id = p_credito for update;
  if v_estado is null or v_estado in ('ANULADO', 'REFINANCIADO', 'SOLICITUD') then return; end if;
  select bool_and(estado = 'PAGADA'), bool_or(estado = 'EN_MORA'), max(fecha_pago)
    into v_todo, v_mora, v_ultima
  from public.cuota where credito_id = p_credito;
  if v_todo is null then return; end if;
  update public.credito set
    estado = case when v_todo then 'FINALIZADO_LIQUIDADO' when v_mora then 'EN_MORA' else 'VIGENTE' end::public.estado_credito,
    fecha_cancelacion = case when v_todo then coalesce(fecha_cancelacion, v_ultima) end
  where id = p_credito
    and (estado is distinct from (case when v_todo then 'FINALIZADO_LIQUIDADO' when v_mora then 'EN_MORA' else 'VIGENTE' end::public.estado_credito)
         or (not v_todo and fecha_cancelacion is not null));
end $$;
revoke execute on function public.recalcular_credito(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reglas de pagos y aplicaciones (la base las garantiza aunque la app falle)
-- -----------------------------------------------------------------------------
create or replace function public.tg_pago_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_estado public.estado_credito;
begin
  if tg_op = 'INSERT' then
    if new.anulado then raise exception 'Un pago nuevo no puede nacer anulado' using errcode = 'P0001'; end if;
    -- Pagos migrados (sin usuario) pasan sin más reglas.
    if new.registrado_por is not null then
      select estado into v_estado from public.credito where id = new.credito_id;
      if v_estado is null or v_estado not in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') then
        raise exception 'El crédito no admite pagos (estado: %)', coalesce(v_estado::text, 'no existe') using errcode = 'P0001';
      end if;
      if exists (select 1 from public.cierre_caja where usuario_id = new.registrado_por and fecha = new.fecha_pago) then
        raise exception 'Ya cerraste tu caja del %: pide a un administrador que la reabra para registrar más pagos', to_char(new.fecha_pago, 'DD/MM/YYYY')
          using errcode = 'P0001';
      end if;
      if new.metodo <> 'EFECTIVO' and new.metodo <> 'OTRO' and coalesce(trim(new.numero_operacion), '') = '' then
        raise exception 'Indica el n.º de operación del pago con %', lower(new.metodo::text) using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: solo se puede anular (y no se puede deshacer).
  if new.credito_id is distinct from old.credito_id or new.monto is distinct from old.monto
     or new.fecha_pago is distinct from old.fecha_pago or new.metodo is distinct from old.metodo
     or new.registrado_por is distinct from old.registrado_por or new.numero_recibo is distinct from old.numero_recibo then
    raise exception 'Un pago registrado no se modifica: anúlalo y registra uno nuevo' using errcode = 'P0001';
  end if;
  if old.anulado and not new.anulado then
    raise exception 'Un pago anulado no se puede reactivar' using errcode = 'P0001';
  end if;
  if new.anulado and not old.anulado then
    if length(coalesce(trim(new.motivo_anulacion), '')) < 10 then
      raise exception 'Indica el motivo de la anulación (mínimo 10 caracteres)' using errcode = 'P0001';
    end if;
    new.anulado_at := coalesce(new.anulado_at, now());
    new.anulado_por := coalesce(new.anulado_por, (select auth.uid()));
  end if;
  return new;
end $$;

drop trigger if exists pago_validar on public.pago;
create trigger pago_validar before insert or update on public.pago
  for each row execute function public.tg_pago_validar();

-- Al anular: se recalculan las cuotas que tocó el pago y el crédito (si estaba cancelado vuelve a vigente).
create or replace function public.tg_pago_anulado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.anulado and not old.anulado then
    for r in select cuota_id from public.aplicacion_pago where pago_id = new.id loop
      perform public.recalcular_cuota(r.cuota_id);
    end loop;
    update public.credito set estado = 'VIGENTE', fecha_cancelacion = null
    where id = new.credito_id and estado = 'FINALIZADO_LIQUIDADO';
    perform public.recalcular_credito(new.credito_id);
  end if;
  return null;
end $$;

drop trigger if exists pago_anulado on public.pago;
create trigger pago_anulado after update of anulado on public.pago
  for each row execute function public.tg_pago_anulado();

-- El monto del pago debe coincidir con lo aplicado (se verifica al confirmar la transacción).
create or replace function public.tg_pago_cuadra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_total numeric;
begin
  if new.registrado_por is null then return null; end if;
  select coalesce(sum(total), 0) into v_total from public.aplicacion_pago where pago_id = new.id;
  if abs(v_total - new.monto) > 0.004 then
    raise exception 'El pago de S/ % no cuadra con lo aplicado a las cuotas (S/ %)', new.monto, v_total using errcode = 'P0001';
  end if;
  return null;
end $$;

drop trigger if exists pago_cuadra on public.pago;
create constraint trigger pago_cuadra after insert on public.pago
  deferrable initially deferred
  for each row execute function public.tg_pago_cuadra();

create or replace function public.tg_aplicacion_pago()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pago record; v_credito uuid;
begin
  if tg_op = 'INSERT' then
    select credito_id, anulado, registrado_por into v_pago from public.pago where id = new.pago_id;
    select credito_id into v_credito from public.cuota where id = new.cuota_id;
    if v_pago.anulado then raise exception 'No se aplica un pago anulado' using errcode = 'P0001'; end if;
    if v_credito is distinct from v_pago.credito_id then
      raise exception 'La cuota no pertenece al crédito del pago' using errcode = 'P0001';
    end if;
    -- Las aplicaciones migradas ya traen el estado de la cuota.
    if v_pago.registrado_por is not null then
      perform public.recalcular_cuota(new.cuota_id);
      perform public.recalcular_credito(v_credito);
    end if;
    return null;
  end if;
  raise exception 'Las aplicaciones de pago no se modifican ni se borran: anula el pago' using errcode = 'P0001';
end $$;

drop trigger if exists aplicacion_pago_recalcular on public.aplicacion_pago;
create trigger aplicacion_pago_recalcular after insert or update or delete on public.aplicacion_pago
  for each row execute function public.tg_aplicacion_pago();

-- -----------------------------------------------------------------------------
-- Mora: penalidad_diaria × días de atraso que pasan la gracia (con tope opcional)
-- -----------------------------------------------------------------------------
create or replace function public.actualizar_mora(p_fecha date default null, p_credito uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_gracia int; v_tope numeric; v_n int;
begin
  p_fecha := coalesce(p_fecha, public.hoy_lima());
  v_gracia := coalesce((select (valor #>> '{}')::int from public.configuracion where clave = 'dias_gracia_mora'), 3);
  v_tope := (select case when jsonb_typeof(valor) = 'number' then (valor #>> '{}')::numeric end
             from public.configuracion where clave = 'mora_tope_porcentaje_cuota');

  with calculo as (
    select cu.id,
           greatest(
             -- lo ya cobrado como mora nunca se descuenta
             coalesce((select sum(ap.mora) from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id
                       where ap.cuota_id = cu.id and not p.anulado), 0),
             least(
               round(cr.penalidad_diaria * greatest(p_fecha - cu.fecha_vencimiento - v_gracia, 0), 2),
               coalesce(round(cu.monto_cuota * v_tope / 100, 2), 'infinity'::numeric)
             )
           ) as mora
    from public.cuota cu
    join public.credito cr on cr.id = cu.credito_id
    where cu.estado <> 'PAGADA'
      and cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')
      and (p_credito is null or cr.id = p_credito)
  )
  update public.cuota cu set mora = k.mora
  from calculo k
  where k.id = cu.id and cu.mora is distinct from k.mora;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.actualizar_mora(date, uuid) from public, anon;
-- Los usuarios del panel la ejecutan antes de registrar un pago (solo recalcula montos derivados).
grant execute on function public.actualizar_mora(date, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Recalcular estados (job diario): ahora calcula primero la mora y usa la fecha de Lima.
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
  ),
  nuevo as (
    select k.*,
           case
             when k.en_mora then 'ACTIVO_EN_MORA'
             when k.vigente then 'ACTIVO_AL_DIA'
             when k.finalizado and k.score >= 4 then 'EXCELENTE_PAGADOR'
             when k.finalizado then 'ACTIVO_AL_DIA'
             else 'NUEVO' end::public.estado_cliente as estado,
           coalesce(k.finalizado and not k.en_mora and k.score >= 4, false) as apto
    from calculo k
  )
  update public.cliente cl set
    score_interno = n.score,
    estado = n.estado,
    apto_prestamo_efectivo = n.apto
  from nuevo n
  where n.id = cl.id
    and (cl.score_interno is distinct from n.score
         or cl.estado is distinct from n.estado
         or cl.apto_prestamo_efectivo is distinct from n.apto);
  get diagnostics v_clientes = row_count;

  return query select v_cuotas, v_creditos, v_clientes;
end $$;
revoke execute on function public.recalcular_estados(date, int) from public, anon, authenticated;

-- Una vez por día (Lima): lo llama el panel al abrirse y el job programado. Devuelve true si corrió.
create or replace function public.proceso_diario()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hoy date := public.hoy_lima();
begin
  if (select valor #>> '{}' from public.configuracion where clave = 'proceso_diario_fecha') = to_char(v_hoy, 'YYYY-MM-DD') then
    return false;
  end if;
  if not pg_try_advisory_xact_lock(hashtext('inversiones_jp.proceso_diario')) then return false; end if;
  perform public.recalcular_estados(v_hoy);
  insert into public.configuracion (clave, valor, descripcion)
  values ('proceso_diario_fecha', to_jsonb(to_char(v_hoy, 'YYYY-MM-DD')), 'Último día en que se ejecutó el cálculo diario de mora y estados')
  on conflict (clave) do update set valor = excluded.valor, updated_at = now();
  return true;
end $$;
revoke execute on function public.proceso_diario() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Vistas con la fecha de Lima y la mora incluida en el saldo
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
  greatest(public.hoy_lima() - cu.fecha_vencimiento, 0) as dias_atraso,
  case
    when cu.fecha_vencimiento > public.hoy_lima() then 'POR_VENCER'
    when cu.fecha_vencimiento = public.hoy_lima() then 'VENCE_HOY'
    when public.hoy_lima() - cu.fecha_vencimiento <= 7  then 'MORA_1_7'
    when public.hoy_lima() - cu.fecha_vencimiento <= 15 then 'MORA_8_15'
    when public.hoy_lima() - cu.fecha_vencimiento <= 30 then 'MORA_16_30'
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
  coalesce((select sum(greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0))
            from public.cuota cu join public.credito c2 on c2.id = cu.credito_id
            where c2.tipo = cr.tipo and c2.estado in ('VIGENTE', 'EN_MORA') and cu.estado <> 'PAGADA'), 0) as saldo_por_cobrar
from public.credito cr
group by cr.tipo;

-- -----------------------------------------------------------------------------
-- Cierre de caja: la base calcula los totales del usuario en el día
-- -----------------------------------------------------------------------------
alter table public.cierre_caja add column if not exists cantidad_pagos int not null default 0;
alter table public.cierre_caja add column if not exists efectivo_contado numeric(12,2);

create or replace function public.tg_cierre_caja()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(sum(monto) filter (where metodo = 'EFECTIVO'), 0),
         coalesce(sum(monto) filter (where metodo <> 'EFECTIVO'), 0),
         count(*)
    into new.total_efectivo, new.total_digital, new.cantidad_pagos
  from public.pago
  where registrado_por = new.usuario_id and fecha_pago = new.fecha and not anulado;
  if new.efectivo_contado is null or new.efectivo_contado < 0 then
    raise exception 'Indica el efectivo contado' using errcode = 'P0001';
  end if;
  -- Lo digital no pasa por la mano del cobrador: se da por recibido. La diferencia es solo del efectivo.
  new.total_declarado := new.efectivo_contado + new.total_digital;
  return new;
end $$;

drop trigger if exists cierre_caja_totales on public.cierre_caja;
create trigger cierre_caja_totales before insert on public.cierre_caja
  for each row execute function public.tg_cierre_caja();

drop policy if exists "admins reabren cajas" on public.cierre_caja;
create policy "admins reabren cajas" on public.cierre_caja
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));

drop trigger if exists cierre_caja_auditoria on public.cierre_caja;
create trigger cierre_caja_auditoria after insert or update or delete on public.cierre_caja
  for each row execute function public.tg_auditar();

-- -----------------------------------------------------------------------------
-- Bloqueo de celular / corte de GPS (registro manual; las APIs de PayJoy/Knox/GPS se integran después)
-- -----------------------------------------------------------------------------
create or replace function public.tg_evento_bloqueo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cr record;
begin
  select unidad_vehiculo_id, unidad_celular_id, estado into cr from public.credito where id = new.credito_id;
  if cr is null then raise exception 'El crédito no existe' using errcode = 'P0001'; end if;
  if length(coalesce(trim(new.motivo), '')) < 5 then
    raise exception 'Indica el motivo (mínimo 5 caracteres)' using errcode = 'P0001';
  end if;
  if new.accion in ('BLOQUEAR', 'DESBLOQUEAR', 'LIBERAR') then
    if cr.unidad_celular_id is null then raise exception 'El crédito no tiene un celular' using errcode = 'P0001'; end if;
    new.unidad_celular_id := cr.unidad_celular_id;
    new.unidad_vehiculo_id := null;
    update public.unidad_celular set estado_bloqueo = case new.accion
        when 'BLOQUEAR' then 'BLOQUEADO_POR_MORA' when 'DESBLOQUEAR' then 'DESBLOQUEADO_OPERATIVO' else 'LIBERADO_DEFINITIVO' end::public.estado_bloqueo
    where id = cr.unidad_celular_id;
  else
    if cr.unidad_vehiculo_id is null then raise exception 'El crédito no tiene un vehículo' using errcode = 'P0001'; end if;
    new.unidad_vehiculo_id := cr.unidad_vehiculo_id;
    new.unidad_celular_id := null;
    update public.unidad_vehiculo set estado_gps = case new.accion
        when 'CORTAR_GPS' then 'CORTADO_POR_MORA' else 'HABILITADO' end::public.estado_corte_gps
    where id = cr.unidad_vehiculo_id;
  end if;
  return new;
end $$;

drop trigger if exists evento_bloqueo_validar on public.evento_bloqueo;
create trigger evento_bloqueo_validar before insert on public.evento_bloqueo
  for each row execute function public.tg_evento_bloqueo();
create index if not exists evento_bloqueo_credito_idx on public.evento_bloqueo (credito_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Poner al día la mora y los estados con las reglas nuevas
-- -----------------------------------------------------------------------------
select public.recalcular_estados();
