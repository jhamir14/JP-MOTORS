-- =============================================================================
-- Inversiones JP · Administradores por área (2/2): permisos en la base
-- -----------------------------------------------------------------------------
--   · Los administradores de motos y de celulares tienen los mismos permisos generales que el de
--     créditos (las políticas existentes que nombran ADMIN_CREDITOS los incluyen vía tiene_rol).
--   · Políticas RESTRICTIVAS: cada administrador de área solo crea o modifica créditos de su tipo,
--     y los de motos/celulares solo el inventario y el catálogo de su área. El préstamo de dinero no
--     tiene productos. El superadmin, el cobrador y las cuentas antiguas no tienen restricción de área.
--   · Las comparaciones usan texto para no depender de los valores nuevos del enum en esta transacción.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

create or replace function public.tiene_rol(variadic roles public.rol_usuario[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.rol_actual() = any (roles)
    or (public.rol_actual()::text in ('ADMIN_MOTOS', 'ADMIN_CELULARES') and 'ADMIN_CREDITOS' = any (roles::text[])),
    false)
$$;

-- Tipo de crédito del que se encarga el usuario actual (null = todas las áreas).
create or replace function public.area_actual()
returns text
language sql stable security definer set search_path = '' as $$
  select case public.rol_actual()::text
           when 'ADMIN_CREDITOS' then 'PRESTAMO_EFECTIVO'
           when 'ADMIN_MOTOS' then 'CREDITO_VEHICULAR'
           when 'ADMIN_CELULARES' then 'CREDITO_CELULAR'
         end
$$;

create or replace function public.area_permite(tipo text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.area_actual() is null or public.area_actual() = tipo, true)
$$;

revoke execute on function public.area_actual() from public, anon;
revoke execute on function public.area_permite(text) from public, anon;
grant execute on function public.area_actual() to authenticated;
grant execute on function public.area_permite(text) to authenticated;

-- Créditos: solo los del área.
drop policy if exists "área: alta de créditos" on public.credito;
create policy "área: alta de créditos" on public.credito as restrictive
  for insert to authenticated with check ((select public.area_permite(tipo::text)));
drop policy if exists "área: cambios en créditos" on public.credito;
create policy "área: cambios en créditos" on public.credito as restrictive
  for update to authenticated using ((select public.area_permite(tipo::text))) with check ((select public.area_permite(tipo::text)));

-- Inventario: motos para el área de motos, celulares para el de celulares.
drop policy if exists "área: alta de vehículos" on public.unidad_vehiculo;
create policy "área: alta de vehículos" on public.unidad_vehiculo as restrictive
  for insert to authenticated with check ((select public.area_permite('CREDITO_VEHICULAR')));
drop policy if exists "área: cambios en vehículos" on public.unidad_vehiculo;
create policy "área: cambios en vehículos" on public.unidad_vehiculo as restrictive
  for update to authenticated using ((select public.area_permite('CREDITO_VEHICULAR'))) with check ((select public.area_permite('CREDITO_VEHICULAR')));

drop policy if exists "área: alta de celulares" on public.unidad_celular;
create policy "área: alta de celulares" on public.unidad_celular as restrictive
  for insert to authenticated with check ((select public.area_permite('CREDITO_CELULAR')));
drop policy if exists "área: cambios en celulares" on public.unidad_celular;
create policy "área: cambios en celulares" on public.unidad_celular as restrictive
  for update to authenticated using ((select public.area_permite('CREDITO_CELULAR'))) with check ((select public.area_permite('CREDITO_CELULAR')));

-- Catálogo: cada producto pertenece al área de su categoría.
drop policy if exists "área: alta en catálogo" on public.producto_catalogo;
create policy "área: alta en catálogo" on public.producto_catalogo as restrictive
  for insert to authenticated
  with check ((select public.area_permite(case when categoria::text = 'CELULAR' then 'CREDITO_CELULAR' else 'CREDITO_VEHICULAR' end)));
drop policy if exists "área: cambios en catálogo" on public.producto_catalogo;
create policy "área: cambios en catálogo" on public.producto_catalogo as restrictive
  for update to authenticated
  using ((select public.area_permite(case when categoria::text = 'CELULAR' then 'CREDITO_CELULAR' else 'CREDITO_VEHICULAR' end)))
  with check ((select public.area_permite(case when categoria::text = 'CELULAR' then 'CREDITO_CELULAR' else 'CREDITO_VEHICULAR' end)));
