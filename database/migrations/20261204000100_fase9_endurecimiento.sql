-- =============================================================================
-- Inversiones JP · Fase 9 · Endurecimiento para producción
-- -----------------------------------------------------------------------------
--   · limite_intento + registrar_intento(): rate-limit COMPARTIDO entre todas las
--     instancias serverless (login, solicitudes, reclamos, recibos públicos). La clave
--     llega ya cifrada con SHA-256 desde la app: la tabla no guarda IPs ni correos.
--   · error_app: errores del servidor capturados por instrumentation.ts (onRequestError),
--     sin datos personales (ruta sin query, mensaje truncado). Solo el Superadmin los lee.
--   · audit_log: índice para listar descargas de reportes.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rate-limit compartido
-- -----------------------------------------------------------------------------
create table if not exists public.limite_intento (
  clave   text primary key check (clave ~ '^[a-z_]+:[0-9a-f]{64}$'),
  inicio  timestamptz not null default now(),
  cuenta  int not null default 1
);
alter table public.limite_intento enable row level security;
-- Sin políticas: solo el dueño de la base (la app en el servidor) y las funciones security definer.

/** true si el intento está permitido (cuenta dentro del máximo de la ventana). Atómico. */
create or replace function public.registrar_intento(p_clave text, p_maximo int, p_ventana_seg int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_cuenta int;
begin
  insert into public.limite_intento as l (clave, inicio, cuenta) values (p_clave, now(), 1)
  on conflict (clave) do update set
    inicio = case when l.inicio < now() - make_interval(secs => p_ventana_seg) then now() else l.inicio end,
    cuenta = case when l.inicio < now() - make_interval(secs => p_ventana_seg) then 1 else l.cuenta + 1 end
  returning cuenta into v_cuenta;
  -- Limpieza oportunista (~1 de cada 200 llamadas) de ventanas vencidas hace más de un día.
  if random() < 0.005 then
    delete from public.limite_intento where inicio < now() - interval '1 day';
  end if;
  return v_cuenta <= p_maximo;
end $$;
revoke execute on function public.registrar_intento(text, int, int) from public, anon, authenticated;

create or replace function public.reiniciar_intentos(p_clave text)
returns void language sql security definer set search_path = '' as $$
  delete from public.limite_intento where clave = p_clave
$$;
revoke execute on function public.reiniciar_intentos(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Monitoreo de errores
-- -----------------------------------------------------------------------------
create table if not exists public.error_app (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  origen      text not null check (origen in ('servidor', 'panel', 'web')),
  ruta        text,
  metodo      text,
  tipo_ruta   text,
  mensaje     text not null,
  digest      text,
  entorno     text
);
create index if not exists error_app_fecha_idx on public.error_app (created_at desc);
alter table public.error_app enable row level security;
drop policy if exists "superadmin lee errores" on public.error_app;
create policy "superadmin lee errores" on public.error_app for select to authenticated
  using ((select public.rol_actual()) = 'SUPERADMIN');

/** Guarda un error recortando los textos; conserva como máximo 5 000 registros. */
create or replace function public.registrar_error(
  p_origen text, p_ruta text, p_metodo text, p_tipo_ruta text, p_mensaje text, p_digest text, p_entorno text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.error_app (origen, ruta, metodo, tipo_ruta, mensaje, digest, entorno)
  values (p_origen, left(split_part(p_ruta, '?', 1), 300), left(p_metodo, 10), left(p_tipo_ruta, 30),
          left(coalesce(nullif(p_mensaje, ''), 'Error sin mensaje'), 1000), left(p_digest, 100), left(p_entorno, 30));
  if random() < 0.01 then
    delete from public.error_app where id < (select max(id) - 5000 from public.error_app);
  end if;
end $$;
revoke execute on function public.registrar_error(text, text, text, text, text, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Auditoría: consultas por acción (descargas de reportes y documentos)
-- -----------------------------------------------------------------------------
create index if not exists audit_log_accion_idx on public.audit_log (accion, created_at desc);
