-- =============================================================================
-- Inversiones JP · Panel más simple y préstamos de dinero
-- -----------------------------------------------------------------------------
--   · Vuelven los préstamos de dinero (PRESTAMO_EFECTIVO) desde el panel: se quita el
--     bloqueo del trigger y se reactivan sus tasas (no se publican en la web).
--   · El garante del crédito vehicular pasa a ser opcional.
--   · La ficha del cliente se simplifica (nombre, apellido, DNI, sexo, celular y correo);
--     se recalcula `datos_incompletos` con ese criterio.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

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
    -- Préstamo de dinero: sin unidad ni inicial (también lo exige el check de la tabla).
    if new.tipo = 'PRESTAMO_EFECTIVO' and (new.unidad_vehiculo_id is not null or new.unidad_celular_id is not null) then
      raise exception 'Un préstamo de dinero no lleva unidad' using errcode = 'P0001';
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

update public.tasa_servicio set activa = true, publica = false, updated_at = now()
where servicio = 'PRESTAMO_EFECTIVO' and not activa;

update public.configuracion set valor = 'false'::jsonb
where clave = 'credito_vehicular_exige_garante' and valor <> 'false'::jsonb;

update public.cliente c
set datos_incompletos = not (
      c.sexo is not null
  and c.telefono ~ '^9[0-9]{8}$'
  and coalesce(c.email::text, '') <> ''
  and c.numero_documento !~* '^(SIN-?DOC|OLD)'
)
where c.datos_incompletos is distinct from not (
      c.sexo is not null
  and c.telefono ~ '^9[0-9]{8}$'
  and coalesce(c.email::text, '') <> ''
  and c.numero_documento !~* '^(SIN-?DOC|OLD)'
);
