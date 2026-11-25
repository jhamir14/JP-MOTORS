-- =============================================================================
-- Inversiones JP · Fase 3 · Clientes (KYC), garantes y documentos privados
-- -----------------------------------------------------------------------------
--   · documento_kyc: fotos de DNI, recibo de servicio, fachada y otros documentos
--     de clientes y garantes. Almacenamiento PRIVADO (bytea): nunca se sirve por
--     /api/archivos; solo por /api/kyc/<id> con sesión del panel y rol, y cada
--     descarga queda en audit_log (accion = 'DESCARGA').
--   · cliente_garante: un garante puede respaldar a varios clientes (y créditos).
--   · cliente: datos de la geolocalización del domicilio (precisión y fecha).
--   · Auditoría de cliente, garante, vínculos y documentos (sin los bytes).
-- Idempotente: se puede volver a ejecutar sin duplicar datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auditoría: se registran también las descargas de documentos privados
-- -----------------------------------------------------------------------------
alter table public.audit_log drop constraint if exists audit_log_accion_check;
alter table public.audit_log
  add constraint audit_log_accion_check check (accion in ('INSERT', 'UPDATE', 'DELETE', 'DESCARGA'));

-- Variante de tg_auditar que no copia columnas pesadas (bytea) al log.
create or replace function public.tg_auditar_sin_datos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (tabla, registro_id, accion, antes, despues, usuario_id)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id::text else new.id::text end,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'datos' end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'datos' end,
    (select auth.uid())
  );
  return null;
end $$;

-- -----------------------------------------------------------------------------
-- Cliente: geolocalización del domicilio
-- -----------------------------------------------------------------------------
alter table public.cliente add column if not exists geo_precision_m int check (geo_precision_m >= 0);
alter table public.cliente add column if not exists geo_registrada_at timestamptz;
alter table public.cliente add column if not exists registrado_por uuid references auth.users (id);
create index if not exists cliente_documento_idx on public.cliente (numero_documento);
create index if not exists cliente_incompletos_idx on public.cliente (datos_incompletos) where datos_incompletos;

-- Las columnas foto_dni_anverso, foto_dni_reverso, recibo_servicio y foto_fachada de la Fase 1
-- quedan en desuso: los documentos viven en documento_kyc.
comment on column public.cliente.foto_dni_anverso is 'En desuso desde la Fase 3: ver documento_kyc';
comment on column public.cliente.foto_dni_reverso is 'En desuso desde la Fase 3: ver documento_kyc';
comment on column public.cliente.recibo_servicio  is 'En desuso desde la Fase 3: ver documento_kyc';
comment on column public.cliente.foto_fachada     is 'En desuso desde la Fase 3: ver documento_kyc';
comment on column public.garante.foto_dni_anverso is 'En desuso desde la Fase 3: ver documento_kyc';
comment on column public.garante.foto_dni_reverso is 'En desuso desde la Fase 3: ver documento_kyc';

-- -----------------------------------------------------------------------------
-- Documentos KYC (privados)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.tipo_documento_kyc as enum ('DNI_ANVERSO', 'DNI_REVERSO', 'RECIBO_SERVICIO', 'FACHADA', 'OTRO');
exception when duplicate_object then null; end $$;

create table if not exists public.documento_kyc (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references public.cliente (id) on delete cascade,
  garante_id  uuid references public.garante (id) on delete cascade,
  tipo        public.tipo_documento_kyc not null,
  nombre      text not null,
  tipo_mime   text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  tamano      int not null check (tamano > 0 and tamano <= 8 * 1024 * 1024),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  datos       bytea not null,
  subido_por  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  check ((cliente_id is null) <> (garante_id is null))
);
create index if not exists documento_kyc_cliente_idx on public.documento_kyc (cliente_id, tipo) where cliente_id is not null;
create index if not exists documento_kyc_garante_idx on public.documento_kyc (garante_id, tipo) where garante_id is not null;

alter table public.documento_kyc enable row level security;
revoke all on public.documento_kyc from anon, authenticated;
-- El personal puede listar los documentos, pero NO leer los bytes directamente (solo vía /api/kyc con auditoría).
grant select (id, cliente_id, garante_id, tipo, nombre, tipo_mime, tamano, sha256, subido_por, created_at)
  on public.documento_kyc to authenticated;
grant insert, delete on public.documento_kyc to authenticated;

drop policy if exists "personal lee documentos" on public.documento_kyc;
create policy "personal lee documentos" on public.documento_kyc
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "ventas sube documentos" on public.documento_kyc;
create policy "ventas sube documentos" on public.documento_kyc
  for insert to authenticated
  with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')) and subido_por = (select auth.uid()));
drop policy if exists "ventas borra documentos" on public.documento_kyc;
create policy "ventas borra documentos" on public.documento_kyc
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));

drop trigger if exists documento_kyc_auditoria on public.documento_kyc;
create trigger documento_kyc_auditoria after insert or update or delete on public.documento_kyc
  for each row execute function public.tg_auditar_sin_datos();

-- -----------------------------------------------------------------------------
-- Garantes vinculados a clientes (reutilizables)
-- -----------------------------------------------------------------------------
create table if not exists public.cliente_garante (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.cliente (id) on delete cascade,
  garante_id  uuid not null references public.garante (id) on delete cascade,
  parentesco  public.parentesco,
  notas       text,
  created_at  timestamptz not null default now(),
  unique (cliente_id, garante_id)
);
create index if not exists cliente_garante_garante_idx on public.cliente_garante (garante_id);

alter table public.cliente_garante enable row level security;
grant select, insert, update, delete on public.cliente_garante to authenticated;
revoke all on public.cliente_garante from anon;

drop policy if exists "personal lee" on public.cliente_garante;
create policy "personal lee" on public.cliente_garante
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "ventas vincula garantes" on public.cliente_garante;
create policy "ventas vincula garantes" on public.cliente_garante
  for insert to authenticated with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));
drop policy if exists "ventas actualiza vínculos" on public.cliente_garante;
create policy "ventas actualiza vínculos" on public.cliente_garante
  for update to authenticated
  using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')))
  with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));
drop policy if exists "ventas desvincula garantes" on public.cliente_garante;
create policy "ventas desvincula garantes" on public.cliente_garante
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));

-- Los garantes que ya figuran en créditos migrados quedan vinculados a su cliente.
insert into public.cliente_garante (cliente_id, garante_id)
select distinct c.cliente_id, c.garante_id from public.credito c where c.garante_id is not null
on conflict (cliente_id, garante_id) do nothing;

-- -----------------------------------------------------------------------------
-- Auditoría de datos personales (quién creó o cambió cada ficha)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cliente', 'garante', 'cliente_garante', 'solicitud_credito']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_auditoria', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_auditar()',
                   t || '_auditoria', t);
  end loop;
end $$;
