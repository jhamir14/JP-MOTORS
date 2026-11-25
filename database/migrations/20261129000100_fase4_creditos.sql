-- =============================================================================
-- Inversiones JP · Fase 4 · Motor de créditos
-- -----------------------------------------------------------------------------
--   · Alta de créditos desde el panel: el cronograma (montos y fechas) se calcula en la app
--     con lib/finance.ts y lib/calendario.ts y se inserta en una sola transacción.
--   · Una unidad anulada vuelve a stock y se puede volver a financiar: la unicidad de
--     unidad_vehiculo_id / unidad_celular_id pasa a aplicar solo a créditos no anulados.
--   · Anulación con motivo, fecha y usuario (además de audit_log). Solo si no hay pagos.
--   · Parámetros de negocio pendientes de decisión, editables en `configuracion`.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unidad única solo entre créditos vigentes (permite volver a financiar una unidad tras anular)
-- -----------------------------------------------------------------------------
alter table public.credito drop constraint if exists credito_unidad_vehiculo_id_key;
alter table public.credito drop constraint if exists credito_unidad_celular_id_key;
create unique index if not exists credito_unidad_vehiculo_activa
  on public.credito (unidad_vehiculo_id) where unidad_vehiculo_id is not null and estado <> 'ANULADO';
create unique index if not exists credito_unidad_celular_activa
  on public.credito (unidad_celular_id) where unidad_celular_id is not null and estado <> 'ANULADO';

-- -----------------------------------------------------------------------------
-- Datos de la anulación
-- -----------------------------------------------------------------------------
alter table public.credito add column if not exists anulado_por uuid references auth.users (id);
alter table public.credito add column if not exists anulado_at  timestamptz;

-- -----------------------------------------------------------------------------
-- Reglas que la base garantiza aunque la app falle
-- -----------------------------------------------------------------------------
create or replace function public.tg_validar_credito()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_unidad;
begin
  if tg_op = 'INSERT' and new.legado_origen is null then
    -- El cliente no puede estar bloqueado
    if exists (select 1 from public.cliente where id = new.cliente_id and estado = 'BLOQUEADO_LEGAL') then
      raise exception 'El cliente tiene bloqueo legal: no puede recibir créditos' using errcode = 'P0001';
    end if;
    -- La unidad debe estar disponible
    if new.unidad_vehiculo_id is not null then
      select estado into v_estado from public.unidad_vehiculo where id = new.unidad_vehiculo_id for update;
      if v_estado is null or v_estado not in ('EN_STOCK', 'RESERVADO') then
        raise exception 'La unidad ya no está disponible (estado: %)', coalesce(v_estado::text, 'no existe') using errcode = 'P0001';
      end if;
    end if;
    if new.unidad_celular_id is not null then
      select estado into v_estado from public.unidad_celular where id = new.unidad_celular_id for update;
      if v_estado is null or v_estado not in ('EN_STOCK', 'RESERVADO') then
        raise exception 'La unidad ya no está disponible (estado: %)', coalesce(v_estado::text, 'no existe') using errcode = 'P0001';
      end if;
    end if;
    if new.tipo = 'PRESTAMO_EFECTIVO' then
      raise exception 'La empresa ya no otorga préstamos en efectivo' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.estado = 'ANULADO' and old.estado <> 'ANULADO' then
    if exists (select 1 from public.pago where credito_id = new.id and not anulado) then
      raise exception 'El crédito tiene pagos registrados: anula primero los pagos' using errcode = 'P0001';
    end if;
    new.anulado_at := coalesce(new.anulado_at, now());
    new.anulado_por := coalesce(new.anulado_por, (select auth.uid()));
  end if;
  if tg_op = 'UPDATE' and old.estado = 'ANULADO' and new.estado <> 'ANULADO' then
    raise exception 'Un crédito anulado no se puede reactivar: registra uno nuevo' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists credito_validar on public.credito;
create trigger credito_validar before insert or update of estado on public.credito
  for each row execute function public.tg_validar_credito();

-- -----------------------------------------------------------------------------
-- Parámetros de negocio (pendientes de decisión: se pueden cambiar sin desplegar)
-- -----------------------------------------------------------------------------
insert into public.configuracion (clave, valor, descripcion, publica) values
  ('credito_exige_expediente_completo', 'false'::jsonb,
   'true = no se puede registrar un crédito si el expediente del cliente está incompleto; false = solo se advierte', false),
  ('credito_vehicular_exige_garante', 'true'::jsonb,
   'true = el crédito vehicular exige un garante vinculado al cliente', false)
on conflict (clave) do nothing;
