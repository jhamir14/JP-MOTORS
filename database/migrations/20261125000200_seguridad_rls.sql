-- =============================================================================
-- Inversiones JP · Fase 1 · Seguridad (Row Level Security) y auditoría
-- -----------------------------------------------------------------------------
-- Reglas:
--   · Todas las tablas tienen RLS activado. Sin política = sin acceso.
--   · La web pública (rol anon) solo lee catálogo publicado, planes publicados,
--     tasas marcadas como públicas y configuración pública.
--   · Las solicitudes de la web se insertan desde el servidor (/api/solicitudes)
--     con la service_role key, que nunca llega al navegador.
--   · El personal (usuarios con perfil activo) accede según su rol.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones de rol (security definer para no recursar en las políticas)
-- -----------------------------------------------------------------------------
create or replace function public.rol_actual()
returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select p.rol from public.perfil_usuario p
  where p.id = (select auth.uid()) and p.activo
$$;

create or replace function public.es_personal()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfil_usuario p where p.id = (select auth.uid()) and p.activo)
$$;

create or replace function public.tiene_rol(variadic roles public.rol_usuario[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.rol_actual() = any (roles), false)
$$;

revoke execute on function public.rol_actual() from public, anon;
revoke execute on function public.es_personal() from public, anon;
revoke execute on function public.tiene_rol(public.rol_usuario[]) from public, anon;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.es_personal() to authenticated;
grant execute on function public.tiene_rol(public.rol_usuario[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sucursal','perfil_usuario','configuracion','tasa_servicio','cliente','garante',
                           'producto_catalogo','imagen_producto','plan_credito','unidad_vehiculo','unidad_celular',
                           'credito','cuota','pago','aplicacion_pago','evento_bloqueo','solicitud_credito',
                           'audit_log','cierre_caja']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Lectura pública (web)
-- -----------------------------------------------------------------------------
create policy "web lee catálogo publicado" on public.producto_catalogo
  for select to anon, authenticated using (publicado);
create policy "web lee imágenes de productos publicados" on public.imagen_producto
  for select to anon, authenticated
  using (exists (select 1 from public.producto_catalogo p where p.id = producto_id and p.publicado));
create policy "web lee planes publicados" on public.plan_credito
  for select to anon, authenticated
  using (publicado and exists (select 1 from public.producto_catalogo p where p.id = producto_id and p.publicado));
create policy "web lee tasas públicas" on public.tasa_servicio
  for select to anon, authenticated using (publica and activa);
create policy "web lee configuración pública" on public.configuracion
  for select to anon, authenticated using (publica);

-- -----------------------------------------------------------------------------
-- Personal: lectura general
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sucursal','perfil_usuario','configuracion','tasa_servicio','cliente','garante',
                           'producto_catalogo','imagen_producto','plan_credito','unidad_vehiculo','unidad_celular',
                           'credito','cuota','pago','aplicacion_pago','evento_bloqueo','solicitud_credito']
  loop
    execute format('create policy "personal lee" on public.%I for select to authenticated using ((select public.es_personal()))', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Personal: escritura por rol
-- -----------------------------------------------------------------------------
-- Administración general: solo SUPERADMIN
create policy "superadmin gestiona sucursales" on public.sucursal
  for all to authenticated using ((select public.tiene_rol('SUPERADMIN'))) with check ((select public.tiene_rol('SUPERADMIN')));
create policy "superadmin gestiona personal" on public.perfil_usuario
  for all to authenticated using ((select public.tiene_rol('SUPERADMIN'))) with check ((select public.tiene_rol('SUPERADMIN')));
create policy "superadmin gestiona configuración" on public.configuracion
  for all to authenticated using ((select public.tiene_rol('SUPERADMIN'))) with check ((select public.tiene_rol('SUPERADMIN')));

-- Tasas: SUPERADMIN y ADMIN_CREDITOS
create policy "admins gestionan tasas" on public.tasa_servicio
  for all to authenticated
  using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')))
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));

-- Catálogo, planes, inventario, clientes y garantes: admins y asesores (sin borrar)
do $$
declare t text;
begin
  foreach t in array array['producto_catalogo','imagen_producto','plan_credito','unidad_vehiculo','unidad_celular',
                           'cliente','garante']
  loop
    execute format($f$create policy "ventas inserta" on public.%I for insert to authenticated
                      with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')))$f$, t);
    execute format($f$create policy "ventas actualiza" on public.%I for update to authenticated
                      using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')))
                      with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')))$f$, t);
    execute format($f$create policy "superadmin borra" on public.%I for delete to authenticated
                      using ((select public.tiene_rol('SUPERADMIN')))$f$, t);
  end loop;
end $$;

-- Créditos y cuotas: SUPERADMIN y ADMIN_CREDITOS. Nunca se borran: se anulan.
create policy "admins crean créditos" on public.credito
  for insert to authenticated with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
create policy "admins actualizan créditos" on public.credito
  for update to authenticated
  using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')))
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
create policy "admins gestionan cuotas" on public.cuota
  for insert to authenticated with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
create policy "admins actualizan cuotas" on public.cuota
  for update to authenticated
  using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')))
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));

-- Pagos: cualquier miembro del personal registra; solo admins corrigen/anulan.
create policy "personal registra pagos" on public.pago
  for insert to authenticated
  with check ((select public.es_personal()) and registrado_por = (select auth.uid()));
create policy "admins corrigen pagos" on public.pago
  for update to authenticated
  using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')))
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
create policy "personal aplica pagos" on public.aplicacion_pago
  for insert to authenticated with check ((select public.es_personal()));

-- Bloqueos: admins y cobradores (queda registrado quién lo hizo)
create policy "registra bloqueos" on public.evento_bloqueo
  for insert to authenticated
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS', 'COBRADOR')) and realizado_por = (select auth.uid()));

-- Solicitudes web: el personal las atiende
create policy "personal atiende solicitudes" on public.solicitud_credito
  for update to authenticated using ((select public.es_personal())) with check ((select public.es_personal()));

-- Auditoría: solo lectura para SUPERADMIN (se escribe por trigger)
create policy "superadmin lee auditoría" on public.audit_log
  for select to authenticated using ((select public.tiene_rol('SUPERADMIN')));

-- Caja: cada cobrador ve y registra la suya; admins ven todas
create policy "cobrador ve su caja" on public.cierre_caja
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
create policy "cobrador cierra su caja" on public.cierre_caja
  for insert to authenticated
  with check ((select public.es_personal()) and usuario_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Auditoría automática de cambios sensibles
-- -----------------------------------------------------------------------------
create or replace function public.tg_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
begin
  v_id := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'clave' else to_jsonb(new) ->> 'clave' end
  );
  insert into public.audit_log (tabla, registro_id, accion, antes, despues, usuario_id)
  values (
    tg_table_name, v_id, tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    (select auth.uid())
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['configuracion','tasa_servicio','plan_credito','credito','pago','evento_bloqueo','perfil_usuario']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_auditar()',
                   t || '_auditoria', t);
  end loop;
end $$;
