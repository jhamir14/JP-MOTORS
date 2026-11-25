-- =============================================================================
-- Inversiones JP · Ajustes de negocio previos a la Fase 4
-- -----------------------------------------------------------------------------
-- Decisiones del 2026-11-25:
--   · La empresa solo FINANCIA productos (motos, mototaxis y celulares): no otorga
--     préstamos de dinero en efectivo. Las tasas de préstamo quedan inactivas; los
--     préstamos migrados del sistema anterior se conservan para su cobranza.
--   · Los domingos y feriados no se cobran: los cronogramas los excluyen de TODAS
--     las frecuencias (configuracion.feriados, editable desde el panel).
--   · Los avisos de pago se envían por WhatsApp desde el panel: recordatorio_pago
--     registra quién envió cada recordatorio y cuándo.
--   · RUC de la empresa en la configuración pública.
-- Idempotente: se puede volver a ejecutar sin duplicar datos ni pisar cambios hechos en el panel.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sin préstamos en efectivo
-- -----------------------------------------------------------------------------
update public.tasa_servicio set activa = false, publica = false
where servicio = 'PRESTAMO_EFECTIVO' and activa;

-- -----------------------------------------------------------------------------
-- Feriados 2026–2028 (fechas AAAA-MM-DD). Solo reemplaza la lista inicial de la Fase 1;
-- si ya se editó desde el panel, se respeta.
-- -----------------------------------------------------------------------------
insert into public.configuracion (clave, valor, descripcion, publica) values
  ('feriados',
   '["2026-01-01","2026-04-02","2026-04-03","2026-05-01","2026-06-07","2026-06-29","2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30","2026-10-08","2026-11-01","2026-12-08","2026-12-09","2026-12-25","2027-01-01","2027-03-25","2027-03-26","2027-05-01","2027-06-07","2027-06-29","2027-07-23","2027-07-28","2027-07-29","2027-08-06","2027-08-30","2027-10-08","2027-11-01","2027-12-08","2027-12-09","2027-12-25","2028-01-01","2028-04-13","2028-04-14","2028-05-01","2028-06-07","2028-06-29","2028-07-23","2028-07-28","2028-07-29","2028-08-06","2028-08-30","2028-10-08","2028-11-01","2028-12-08","2028-12-09","2028-12-25"]'::jsonb,
   'Feriados (AAAA-MM-DD): no se cobran. Ninguna cuota vence en domingo ni feriado; pasa al siguiente día hábil.',
   false)
on conflict (clave) do update
  set valor = excluded.valor, descripcion = excluded.descripcion
  where public.configuracion.valor = '["2026-01-01","2026-04-02","2026-04-03","2026-05-01","2026-06-07","2026-06-29","2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30","2026-10-08","2026-11-01","2026-12-08","2026-12-09","2026-12-25"]'::jsonb;

update public.configuracion
set descripcion = 'Los cronogramas excluyen domingos y feriados en todas las frecuencias'
where clave = 'cobro_diario_excluye_domingo';

-- RUC de la empresa (dato público).
update public.configuracion
set valor = valor || jsonb_build_object('ruc', '10479269217')
where clave = 'empresa' and not (valor ? 'ruc');

-- -----------------------------------------------------------------------------
-- Recordatorios de pago enviados por WhatsApp
-- -----------------------------------------------------------------------------
create table if not exists public.recordatorio_pago (
  id          uuid primary key default gen_random_uuid(),
  credito_id  uuid not null references public.credito (id) on delete cascade,
  tipo        text not null check (tipo in ('MORA', 'VENCE_HOY', 'POR_VENCER', 'AL_DIA')),
  canal       text not null default 'WHATSAPP' check (canal in ('WHATSAPP', 'LLAMADA')),
  enviado_por uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);
create index if not exists recordatorio_pago_credito_idx on public.recordatorio_pago (credito_id, created_at desc);

alter table public.recordatorio_pago enable row level security;
revoke all on public.recordatorio_pago from anon;
grant select, insert on public.recordatorio_pago to authenticated;

drop policy if exists "personal lee recordatorios" on public.recordatorio_pago;
create policy "personal lee recordatorios" on public.recordatorio_pago
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "personal registra recordatorios" on public.recordatorio_pago;
create policy "personal registra recordatorios" on public.recordatorio_pago
  for insert to authenticated
  with check ((select public.es_personal()) and enviado_por = (select auth.uid()));
