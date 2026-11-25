-- =============================================================================
-- Inversiones JP · Fase 2 · Panel administrativo, archivos y Libro de Reclamaciones
-- -----------------------------------------------------------------------------
--   · sesion_panel: sesiones del personal (cookie con token aleatorio; aquí solo
--     se guarda su hash SHA-256). Solo la usa el servidor (dueño de la base).
--   · archivo: imágenes del catálogo subidas desde el panel (bytea). Se sirven
--     públicamente en /api/archivos/<id> solo si pertenecen a un producto publicado.
--   · reclamo: Libro de Reclamaciones virtual (Código de Protección y Defensa del
--     Consumidor, D.S. 011-2011-PCM y modificatorias).
--   · v_stock_producto: unidades EN_STOCK por producto del catálogo.
--   · Repuestos y planes de crédito de ejemplo en el catálogo.
-- Idempotente: se puede volver a ejecutar sin duplicar datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sesiones del panel
-- -----------------------------------------------------------------------------
create table if not exists public.sesion_panel (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  token_hash  text not null unique,
  expira      timestamptz not null,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists sesion_panel_usuario_idx on public.sesion_panel (usuario_id);
alter table public.sesion_panel enable row level security;   -- sin políticas: solo el dueño de la base
revoke all on public.sesion_panel from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Archivos (imágenes del catálogo)
-- -----------------------------------------------------------------------------
create table if not exists public.archivo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  tipo_mime   text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  tamano      int not null check (tamano > 0 and tamano <= 5 * 1024 * 1024),
  datos       bytea not null,
  subido_por  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
alter table public.archivo enable row level security;
grant select, insert, delete on public.archivo to authenticated;
revoke all on public.archivo from anon;

drop policy if exists "personal lee archivos" on public.archivo;
create policy "personal lee archivos" on public.archivo
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "ventas sube archivos" on public.archivo;
create policy "ventas sube archivos" on public.archivo
  for insert to authenticated
  with check ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')) and subido_por = (select auth.uid()));
drop policy if exists "ventas borra archivos" on public.archivo;
create policy "ventas borra archivos" on public.archivo
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));

-- Las imágenes de producto pueden borrarse desde el panel (la política de Fase 1 solo dejaba al SUPERADMIN).
drop policy if exists "ventas borra imágenes" on public.imagen_producto;
create policy "ventas borra imágenes" on public.imagen_producto
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));
drop policy if exists "ventas borra planes" on public.plan_credito;
create policy "ventas borra planes" on public.plan_credito
  for delete to authenticated using ((select public.tiene_rol('SUPERADMIN','ADMIN_CREDITOS','ASESOR_VENTAS')));

-- -----------------------------------------------------------------------------
-- Libro de Reclamaciones
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.tipo_reclamo as enum ('RECLAMO', 'QUEJA');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.estado_reclamo as enum ('PENDIENTE', 'EN_ATENCION', 'RESPONDIDO');
exception when duplicate_object then null; end $$;

create sequence if not exists public.reclamo_codigo_seq;

create table if not exists public.reclamo (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique
                       default ('LR-' || to_char(now() at time zone 'America/Lima', 'YYYY') || '-' || lpad(nextval('public.reclamo_codigo_seq')::text, 6, '0')),
  tipo               public.tipo_reclamo not null,
  -- Consumidor
  nombres            text not null,
  apellidos          text not null,
  tipo_documento     public.tipo_documento not null default 'DNI',
  numero_documento   text not null,
  domicilio          text not null,
  telefono           text not null,
  email              citext not null,
  menor_de_edad      boolean not null default false,
  apoderado          text,                                   -- padre, madre o representante si es menor
  -- Bien contratado
  bien_tipo          text not null check (bien_tipo in ('PRODUCTO', 'SERVICIO')),
  bien_monto         numeric(12,2) check (bien_monto >= 0),
  bien_descripcion   text not null,
  -- Detalle
  detalle            text not null,
  pedido             text not null,
  acepta_datos       boolean not null check (acepta_datos),
  -- Atención
  estado             public.estado_reclamo not null default 'PENDIENTE',
  respuesta          text,
  fecha_respuesta    timestamptz,
  respondido_por     uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (not menor_de_edad or apoderado is not null),
  check (estado <> 'RESPONDIDO' or (respuesta is not null and fecha_respuesta is not null))
);
create index if not exists reclamo_estado_idx on public.reclamo (estado, created_at desc);
alter table public.reclamo enable row level security;

drop trigger if exists reclamo_updated_at on public.reclamo;
create trigger reclamo_updated_at before update on public.reclamo
  for each row execute function public.tg_actualizar_updated_at();
drop trigger if exists reclamo_auditoria on public.reclamo;
create trigger reclamo_auditoria after insert or update or delete on public.reclamo
  for each row execute function public.tg_auditar();

drop policy if exists "personal lee reclamos" on public.reclamo;
create policy "personal lee reclamos" on public.reclamo
  for select to authenticated using ((select public.es_personal()));
drop policy if exists "admins responden reclamos" on public.reclamo;
create policy "admins responden reclamos" on public.reclamo
  for update to authenticated
  using ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')))
  with check ((select public.tiene_rol('SUPERADMIN', 'ADMIN_CREDITOS')));
grant select, update on public.reclamo to authenticated;

-- -----------------------------------------------------------------------------
-- Stock por producto
-- -----------------------------------------------------------------------------
create or replace view public.v_stock_producto with (security_invoker = true) as
select p.id as producto_id,
       coalesce(v.en_stock, 0) + coalesce(c.en_stock, 0) as en_stock
from public.producto_catalogo p
left join (select producto_id, count(*) as en_stock from public.unidad_vehiculo where estado = 'EN_STOCK' group by producto_id) v
  on v.producto_id = p.id
left join (select producto_id, count(*) as en_stock from public.unidad_celular where estado = 'EN_STOCK' group by producto_id) c
  on c.producto_id = p.id;
grant select on public.v_stock_producto to authenticated;

-- -----------------------------------------------------------------------------
-- Repuestos en el catálogo (antes estaban fijos en el código de la web)
-- -----------------------------------------------------------------------------
with repuestos (slug, marca, nombre, descripcion, precio, etiquetas, orden, imagen) as (
  values
  ('repuesto-aceite-honda-10w-30-sintetico', 'Honda', 'Aceite Honda 10W-30 Sintético', 'Aceite 100% sintético de última generación, ideal para modelos deportivos y motores de inyección electrónica. Máxima protección térmica.', 55.00, array['Lubricantes'], 1000, '/repuestos/aceite_sintetico.webp'),
  ('repuesto-aceite-honda-20w-50-mineral', 'Honda', 'Aceite Honda 20W-50 Mineral', 'Aceite mineral original Honda 4 tiempos, formulado para motores de trabajo rudo, motokars y motos de alto kilometraje.', 40.00, array['Lubricantes'], 1010, '/repuestos/aceite.webp'),
  ('repuesto-aceite-semi-sintetico-15w-40', 'Honda', 'Aceite Semi-Sintético 15W-40', 'El equilibrio perfecto para scooters urbanas como la Navi o Dio. Protege el embrague automático de fricción extrema.', 48.00, array['Lubricantes'], 1020, '/repuestos/aceite_scooter.webp'),
  ('repuesto-llanta-motokar-trasera-reforzada', 'Honda', 'Llanta Motokar Trasera Reforzada', 'Cauchos traseros reforzados con lona de alta dureza para soportar carga pesada y terreno agreste en trimóviles comerciales.', 135.00, array['Neumáticos'], 1030, '/repuestos/llantas.webp'),
  ('repuesto-llanta-off-road-xr-tornado', 'Honda', 'Llanta Off-Road XR/Tornado', 'Neumático con cocada profunda estilo enduro. Diseñado para ofrecer agarre máximo en barro, tierra y trocha.', 180.00, array['Neumáticos'], 1040, '/repuestos/llanta_offroad.webp'),
  ('repuesto-llanta-sport-lisa-trasera', 'Generico Premium', 'Llanta Sport Lisa Trasera', 'Neumático de pista de perfil ancho, ideal para modelos tipo Pulsar NS200 o CB190R. Excelente agarre en asfalto seco y mojado.', 165.00, array['Neumáticos'], 1050, '/repuestos/llanta_sport.webp'),
  ('repuesto-llanta-scooter-perfil-bajo', 'Honda', 'Llanta Scooter Perfil Bajo', 'Neumático aro pequeño diseñado específicamente para Honda Navi, Dio o Yamaha NMAX. Alta maniobrabilidad urbana.', 95.00, array['Neumáticos'], 1060, '/repuestos/llanta_scooter.webp'),
  ('repuesto-filtro-de-aire-original', 'Honda', 'Filtro de Aire Original', 'Filtro de aire de celulosa de alta densidad para retener impurezas y proteger el carburador e inyección.', 35.00, array['Filtros'], 1070, '/repuestos/filtro.webp'),
  ('repuesto-filtro-de-aceite-deportivo', 'Honda', 'Filtro de Aceite Deportivo', 'Filtro de aceite magnético que retiene micro-partículas de metal del motor para extender la vida útil de la máquina.', 25.00, array['Filtros'], 1080, '/repuestos/filtro_aceite.webp'),
  ('repuesto-pastillas-de-freno-delanteras', 'Honda', 'Pastillas de Freno Delanteras', 'Pastillas de freno de disco sinterizadas. Ofrecen una frenada potente y disipación de calor inmediata.', 55.00, array['Frenos'], 1090, '/repuestos/zapatas.webp'),
  ('repuesto-zapatas-de-freno-de-tambor', 'Honda', 'Zapatas de Freno de Tambor', 'Zapatas traseras originales que aseguran una frenada precisa y sin chirridos mecánicos. Larga duración.', 40.00, array['Frenos'], 1100, '/repuestos/zapatas.webp'),
  ('repuesto-kit-de-arrastre-cadena-corona-pinon', 'Honda', 'Kit de Arrastre (Cadena, Corona, Piñón)', 'Kit completo original. Cadena reforzada con O-Rings, corona y piñón de acero de alta resistencia.', 155.00, array['Transmisión'], 1110, '/repuestos/cadena.webp'),
  ('repuesto-cadena-reforzada-dorada', 'Generico Premium', 'Cadena Reforzada Dorada', 'Cadena de pase 428H con eslabones dorados y tratamiento térmico antidesgaste. Estética y rendimiento deportivo.', 85.00, array['Transmisión'], 1120, '/repuestos/cadena.webp'),
  ('repuesto-kit-de-discos-de-embrague', 'Honda', 'Kit de Discos de Embrague', 'Kit de discos de fricción Honda originales para garantizar una transferencia de potencia sin patinajes.', 65.00, array['Transmisión'], 1130, '/repuestos/disco.webp'),
  ('repuesto-casco-integral-deportivo', 'Honda', 'Casco Integral Deportivo', 'Casco cerrado aerodinámico, certificación DOT. Visor anti-rayaduras y ventilación dinámica para pistas rápidas.', 185.00, array['Seguridad'], 1140, '/repuestos/casco.webp'),
  ('repuesto-casco-abierto-urbano', 'Generico Premium', 'Casco Abierto Urbano', 'Casco 3/4 ideal para ciudad y clima cálido. Excelente visión periférica y gran comodidad interna.', 120.00, array['Seguridad'], 1150, '/repuestos/casco_abierto.webp'),
  ('repuesto-casco-motocross-enduro', 'Generico Premium', 'Casco Motocross Enduro', 'Casco agresivo off-road con mentonera prominente y visera extendida. Máxima protección contra piedras y barro.', 210.00, array['Seguridad'], 1160, '/repuestos/casco_motocross.webp'),
  ('repuesto-bujia-ngk-iridium-racing', 'NGK', 'Bujía NGK Iridium Racing', 'Bujía de punta de iridio. Arranque más rápido, mejor aceleración y combustión eficiente. Triplica la vida útil.', 45.00, array['Eléctrico'], 1170, '/repuestos/bujia.webp'),
  ('repuesto-bujia-estandar-cobre', 'Honda', 'Bujía Estándar Cobre', 'Bujía original Honda de núcleo de cobre, reemplazo económico y confiable para uso diario.', 18.00, array['Eléctrico'], 1180, '/repuestos/bujia.webp'),
  ('repuesto-cable-de-embrague-acero', 'Honda', 'Cable de Embrague Acero', 'Cable original trenzado con funda recubierta en teflón para un accionamiento de embrague suave y preciso.', 28.00, array['Cables'], 1190, '/repuestos/cable.webp'),
  ('repuesto-cable-de-acelerador-dual', 'Honda', 'Cable de Acelerador Dual', 'Conjunto de cables de aceleración (push/pull) originales para una respuesta instantánea al puño.', 32.00, array['Cables'], 1200, '/repuestos/cable.webp')

),
ins as (
  insert into public.producto_catalogo (slug, categoria, marca, modelo, nombre, descripcion, precio_contado, etiquetas, publicado, orden)
  select slug, 'REPUESTO', marca, nombre, nombre, descripcion, precio, etiquetas, true, orden from repuestos
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.imagen_producto (producto_id, url, alt, orden, es_portada)
select ins.id, r.imagen, r.nombre, 0, true from ins join repuestos r using (slug);

-- -----------------------------------------------------------------------------
-- Planes de crédito de ejemplo (los mismos que la web mostraba como referencia)
--   Vehículos: 20 % de inicial, 12 y 24 cuotas mensuales al 2 % mensual (FRANCES).
--   Celulares: sin inicial, 16 cuotas semanales al 1.2 % semanal (FRANCES).
-- Solo se crean si el producto todavía no tiene planes.
-- -----------------------------------------------------------------------------
insert into public.plan_credito (producto_id, nombre, cuota_inicial, numero_cuotas, frecuencia, tipo_calculo, tasa_porcentaje, publicado, orden)
select p.id, n || ' meses', round(p.precio_contado * 0.20, 0), n, 'MENSUAL', 'FRANCES', 2.000, true, n
from public.producto_catalogo p cross join (values (12), (24)) as plazos (n)
where p.categoria in ('MOTO_LINEAL', 'TRIMOVIL_PASAJEROS', 'TRIMOVIL_CARGA')
  and not exists (select 1 from public.plan_credito pc where pc.producto_id = p.id);

insert into public.plan_credito (producto_id, nombre, cuota_inicial, numero_cuotas, frecuencia, tipo_calculo, tasa_porcentaje, publicado, orden)
select p.id, '16 semanas sin inicial', 0, 16, 'SEMANAL', 'FRANCES', 1.200, true, 16
from public.producto_catalogo p
where p.categoria = 'CELULAR'
  and not exists (select 1 from public.plan_credito pc where pc.producto_id = p.id);
