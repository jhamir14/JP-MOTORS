-- =============================================================================
-- Inversiones JP · Avisos de cobranza por notificación push (Web Push)
-- -----------------------------------------------------------------------------
--   push_suscripcion: un registro por navegador/dispositivo del personal que activó los avisos.
--     Con esto el aviso llega aunque la pestaña del panel esté cerrada.
--   push_clave: par de claves VAPID del servidor (se generan solas la primera vez si no están en
--     las variables de entorno VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
--   Ambas tablas solo las usa el servidor (sin políticas RLS: el personal no las lee).
-- =============================================================================

create table if not exists public.push_suscripcion (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  ultimo_envio timestamptz,
  fallos      int not null default 0
);
create index if not exists push_suscripcion_usuario_idx on public.push_suscripcion (usuario_id);
alter table public.push_suscripcion enable row level security;
revoke all on public.push_suscripcion from anon, authenticated;
comment on table public.push_suscripcion is 'Navegadores del personal suscritos a los avisos de cobranza (Web Push).';

create table if not exists public.push_clave (
  id          boolean primary key default true check (id),   -- una sola fila
  publica     text not null,
  privada     text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_clave enable row level security;
revoke all on public.push_clave from anon, authenticated;
comment on table public.push_clave is 'Claves VAPID del servidor para Web Push (si no se definen en variables de entorno).';
