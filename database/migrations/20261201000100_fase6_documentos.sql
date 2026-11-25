-- =============================================================================
-- Inversiones JP · Fase 6 · Documentos
-- -----------------------------------------------------------------------------
--   · Los PDF (contratos, pagaré, cronograma, recibo) se generan en el servidor a partir de los datos
--     congelados del crédito: no se guardan. Lo que sí se guarda es lo FIRMADO y escaneado.
--   · documento_credito: contrato, pagaré, acta de entrega… firmados (bytea privado). El personal ve los
--     metadatos; los bytes solo por /api/documentos-credito/<id> con sesión y auditoría.
--   · pago.token_recibo: enlace no adivinable del recibo para compartirlo por WhatsApp (/r/<token>).
--   · configuracion.empresa_documentos (privada): representante, domicilio y ciudad que van en las plantillas.
--   · configuracion.documentos_validados: false hasta que un abogado valide los textos (las plantillas
--     muestran el aviso de «modelo referencial»).
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Datos de la empresa para los documentos
-- -----------------------------------------------------------------------------
-- Clave PRIVADA (configuracion.empresa es pública y la lee la web): aquí van el representante y su documento.
insert into public.configuracion (clave, valor, descripcion, publica) values
  ('empresa_documentos', jsonb_build_object(
      'representante_legal', null,
      'representante_documento', null,
      'domicilio', null,
      'ciudad', 'Lima'),
   'Datos del vendedor/acreedor que se imprimen en contratos, pagaré y recibos', false)
on conflict (clave) do nothing;

insert into public.configuracion (clave, valor, descripcion, publica) values
  ('documentos_validados', 'false'::jsonb,
   'true cuando un abogado validó los textos de los contratos, la cláusula de bloqueo y el pagaré. Mientras sea false, los PDF indican que son un modelo referencial', false)
on conflict (clave) do nothing;

comment on column public.credito.contrato_pdf is 'En desuso desde la Fase 6: los documentos firmados viven en documento_credito';

-- -----------------------------------------------------------------------------
-- Documentos firmados del crédito (privados)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.tipo_documento_credito as enum ('CONTRATO_FIRMADO', 'PAGARE_FIRMADO', 'CRONOGRAMA_FIRMADO', 'ACTA_ENTREGA', 'OTRO');
exception when duplicate_object then null; end $$;

create table if not exists public.documento_credito (
  id          uuid primary key default gen_random_uuid(),
  credito_id  uuid not null references public.credito (id) on delete cascade,
  tipo        public.tipo_documento_credito not null,
  nombre      text not null,
  tipo_mime   text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  tamano      int not null check (tamano > 0 and tamano <= 10 * 1024 * 1024),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  datos       bytea not null,
  subido_por  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index if not exists documento_credito_credito_idx on public.documento_credito (credito_id, tipo);

alter table public.documento_credito enable row level security;
revoke all on public.documento_credito from anon, authenticated;
-- Metadatos para todo el personal; los bytes solo desde /api/documentos-credito (con sesión, rol y auditoría).
grant select (id, credito_id, tipo, nombre, tipo_mime, tamano, sha256, subido_por, created_at) on public.documento_credito to authenticated;
grant insert, delete on public.documento_credito to authenticated;

drop policy if exists "personal lee documentos de crédito" on public.documento_credito;
create policy "personal lee documentos de crédito" on public.documento_credito
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "ventas sube documentos de crédito" on public.documento_credito;
create policy "ventas sube documentos de crédito" on public.documento_credito
  for insert to authenticated
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS', 'ASESOR_VENTAS')) and subido_por = (select auth.uid()));
drop policy if exists "admins borran documentos de crédito" on public.documento_credito;
create policy "admins borran documentos de crédito" on public.documento_credito
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));

drop trigger if exists documento_credito_auditoria on public.documento_credito;
create trigger documento_credito_auditoria after insert or update or delete on public.documento_credito
  for each row execute function public.tg_auditar_sin_datos();

-- -----------------------------------------------------------------------------
-- Recibo compartible: token no adivinable por pago (~244 bits aleatorios)
-- -----------------------------------------------------------------------------
create or replace function public.nuevo_token_recibo()
returns text language sql volatile set search_path = '' as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- Con un default volátil, PostgreSQL calcula un token distinto para cada pago existente (sin disparar triggers).
alter table public.pago add column if not exists token_recibo text default public.nuevo_token_recibo();
alter table public.pago alter column token_recibo set default public.nuevo_token_recibo();
alter table public.pago alter column token_recibo set not null;
create unique index if not exists pago_token_recibo_key on public.pago (token_recibo);
