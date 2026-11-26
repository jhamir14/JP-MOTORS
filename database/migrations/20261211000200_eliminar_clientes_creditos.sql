-- =============================================================================
-- Inversiones JP · Eliminar créditos y clientes (solo Superadministrador)
-- -----------------------------------------------------------------------------
--   eliminar_credito(id): borra el crédito con su cronograma, pagos (y sus aplicaciones y vouchers),
--     recordatorios, documentos y eventos de bloqueo. La unidad (moto o celular) vuelve a stock.
--   eliminar_cliente(id): borra todos sus créditos (como arriba) y luego al cliente con su expediente
--     (documentos KYC, garantes vinculados, score). Las solicitudes web quedan sin cliente vinculado.
--   Todo queda en la auditoría (los triggers de auditoría registran cada borrado).
--   Las aplicaciones de pago siguen siendo intocables en el uso normal: solo se borran dentro de estas funciones.
-- =============================================================================

create or replace function public.tg_aplicacion_pago()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
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
  -- Solo eliminar_credito / eliminar_cliente pueden borrarlas (junto con todo el crédito).
  if tg_op = 'DELETE' and current_setting('jp.eliminando_credito', true) = 'on' then
    return null;
  end if;
  raise exception 'Las aplicaciones de pago no se modifican ni se borran: anula el pago' using errcode = 'P0001';
end $$;

/** Borra un crédito y todo lo que cuelga de él. No verifica permisos (lo hacen las funciones públicas). */
create or replace function public._borrar_credito(p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare v_cr record;
begin
  select id, unidad_vehiculo_id, unidad_celular_id into v_cr from public.credito where id = p_id for update;
  if not found then
    raise exception 'El crédito ya no existe' using errcode = 'P0002';
  end if;
  perform set_config('jp.eliminando_credito', 'on', true);
  delete from public.evento_bloqueo where credito_id = p_id;
  delete from public.pago where credito_id = p_id;   -- en cascada: aplicaciones y vouchers
  delete from public.credito where id = p_id;        -- en cascada: cuotas, recordatorios y documentos
  perform set_config('jp.eliminando_credito', 'off', true);
  -- La unidad vuelve a stock si ningún otro crédito vivo la usa.
  update public.unidad_vehiculo u set estado = 'EN_STOCK'
  where u.id = v_cr.unidad_vehiculo_id and u.estado in ('VENDIDO_CREDITO', 'RESERVADO')
    and not exists (select 1 from public.credito c where c.unidad_vehiculo_id = u.id and c.estado <> 'ANULADO');
  update public.unidad_celular u set estado = 'EN_STOCK'
  where u.id = v_cr.unidad_celular_id and u.estado in ('VENDIDO_CREDITO', 'RESERVADO')
    and not exists (select 1 from public.credito c where c.unidad_celular_id = u.id and c.estado <> 'ANULADO');
end $$;
revoke execute on function public._borrar_credito(uuid) from public, anon, authenticated;

create or replace function public.eliminar_credito(p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.tiene_rol('SUPERADMIN') then
    raise exception 'Solo el superadministrador puede eliminar créditos' using errcode = '42501';
  end if;
  perform public._borrar_credito(p_id);
  perform public.recalcular_estados();   -- score y estado del cliente sin ese crédito
end $$;
comment on function public.eliminar_credito(uuid) is 'Elimina un crédito con su cronograma, pagos y documentos (solo Superadmin).';
revoke execute on function public.eliminar_credito(uuid) from public, anon;
grant execute on function public.eliminar_credito(uuid) to authenticated;

create or replace function public.eliminar_cliente(p_id uuid)
returns int
language plpgsql
security definer
set search_path to ''
as $$
declare v_credito uuid; v_n int := 0;
begin
  if not public.tiene_rol('SUPERADMIN') then
    raise exception 'Solo el superadministrador puede eliminar clientes' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cliente where id = p_id) then
    raise exception 'El cliente ya no existe' using errcode = 'P0002';
  end if;
  for v_credito in select id from public.credito where cliente_id = p_id loop
    perform public._borrar_credito(v_credito);
    v_n := v_n + 1;
  end loop;
  update public.solicitud_credito set cliente_id = null where cliente_id = p_id;
  delete from public.cliente where id = p_id;   -- en cascada: documentos KYC, garantes vinculados y score
  -- Garantes que ya no respaldan a nadie.
  delete from public.garante g where not exists (select 1 from public.cliente_garante cg where cg.garante_id = g.id)
    and not exists (select 1 from public.credito c where c.garante_id = g.id);
  if v_n > 0 then perform public.recalcular_estados(); end if;
  return v_n;
end $$;
comment on function public.eliminar_cliente(uuid) is 'Elimina un cliente, todos sus créditos y su expediente (solo Superadmin). Devuelve cuántos créditos se borraron.';
revoke execute on function public.eliminar_cliente(uuid) from public, anon;
grant execute on function public.eliminar_cliente(uuid) to authenticated;
