-- =============================================================================
-- Inversiones JP · Compatibilidad para PostgreSQL sin Supabase (Railway)
-- -----------------------------------------------------------------------------
-- Las migraciones siguientes usan el esquema `auth` y los roles de Supabase
-- (auth.users, auth.uid(), anon, authenticated, service_role). En Railway no
-- existen, así que aquí se crean equivalentes mínimos. En Supabase este
-- archivo no hace nada (el esquema auth ya existe).
--
-- Cómo identifica la app al usuario: en cada transacción ejecuta
--     set local role authenticated;
--     select set_config('app.usuario_id', '<uuid del usuario>', true);
-- y auth.uid() devuelve ese id, con lo que se aplican las políticas RLS.
-- Las operaciones de servidor (solicitudes web, jobs) usan el usuario dueño
-- de la base, que no está sujeto a RLS (equivalente a service_role).
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

do $compat$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice 'Esquema auth existente (Supabase): no se crea la capa de compatibilidad';
    return;
  end if;

  -- Roles lógicos (sin login): la app cambia a ellos con SET ROLE.
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  execute format('grant anon, authenticated, service_role to %I', current_user);

  create schema auth;

  -- Usuarios del personal (panel administrativo). La contraseña se guarda solo como hash (bcrypt/argon2).
  create table auth.users (
    id            uuid primary key default gen_random_uuid(),
    email         citext not null unique,
    password_hash text,
    activo        boolean not null default true,
    ultimo_acceso timestamptz,
    created_at    timestamptz not null default now()
  );

  create function auth.uid() returns uuid
    language sql stable
    as $f$ select nullif(current_setting('app.usuario_id', true), '')::uuid $f$;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
  alter default privileges in schema public grant select on tables to anon;
  alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
end
$compat$;
