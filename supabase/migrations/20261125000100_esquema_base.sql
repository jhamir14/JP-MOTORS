-- =============================================================================
-- Inversiones JP · Fase 1 · Esquema base
-- -----------------------------------------------------------------------------
-- Modelo relacional de la financiera: clientes (KYC), catálogo público,
-- inventario serializado, créditos (vehicular, celular, préstamo en efectivo),
-- cronograma de cuotas, pagos con aplicación a cuotas, bloqueos, solicitudes
-- web, configuración, auditoría y cierre de caja.
--
-- Convenciones
--   · Nombres en español y snake_case.
--   · Todos los importes en numeric(12,2) (nunca float).
--   · Tasas en porcentaje: 20.00 = 20 %.
--   · Las columnas legado_* guardan el id de la BD anterior (Django/MySQL)
--     para poder reimportar o rastrear un registro migrado.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- -----------------------------------------------------------------------------
-- Glosario único (enums)
-- -----------------------------------------------------------------------------
create type public.rol_usuario        as enum ('SUPERADMIN', 'ADMIN_CREDITOS', 'ASESOR_VENTAS', 'COBRADOR');
create type public.tipo_documento     as enum ('DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'RUC');
create type public.sexo               as enum ('MASCULINO', 'FEMENINO', 'OTRO');
create type public.estado_civil       as enum ('SOLTERO', 'CASADO', 'CONVIVIENTE', 'DIVORCIADO', 'VIUDO');
create type public.tipo_vivienda      as enum ('PROPIA', 'ALQUILADA', 'FAMILIAR');
create type public.estado_cliente     as enum ('NUEVO', 'ACTIVO_AL_DIA', 'ACTIVO_EN_MORA', 'EXCELENTE_PAGADOR', 'BLOQUEADO_LEGAL');
create type public.tipo_credito       as enum ('CREDITO_VEHICULAR', 'CREDITO_CELULAR', 'PRESTAMO_EFECTIVO');
create type public.frecuencia_pago    as enum ('DIARIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL');
create type public.tipo_calculo       as enum ('FLAT', 'FRANCES');
create type public.estado_credito     as enum ('SOLICITUD', 'APROBADO', 'VIGENTE', 'EN_MORA', 'REFINANCIADO', 'FINALIZADO_LIQUIDADO', 'ANULADO');
create type public.estado_cuota       as enum ('PENDIENTE', 'PAGADA', 'PAGADA_PARCIAL', 'EN_MORA');
create type public.metodo_pago        as enum ('EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'DEPOSITO', 'OTRO');
create type public.categoria_producto as enum ('MOTO_LINEAL', 'TRIMOVIL_PASAJEROS', 'TRIMOVIL_CARGA', 'CELULAR', 'REPUESTO');
create type public.tipo_vehiculo      as enum ('MOTO_LINEAL', 'TRIMOVIL_PASAJEROS', 'TRIMOVIL_CARGA');
create type public.estado_unidad      as enum ('EN_STOCK', 'RESERVADO', 'VENDIDO_CREDITO', 'VENDIDO_CONTADO', 'INCAUTADO_MORA', 'DADO_DE_BAJA');
create type public.condicion_unidad   as enum ('NUEVO', 'SEMINUEVO', 'USADO');
create type public.sistema_operativo  as enum ('ANDROID', 'IOS', 'OTRO');
create type public.plataforma_bloqueo as enum ('PAYJOY', 'KNOX_GUARD', 'TRUSTONIC', 'MDM_PROPIO', 'ICLOUD', 'NINGUNA');
create type public.estado_bloqueo     as enum ('DESBLOQUEADO_OPERATIVO', 'BLOQUEADO_POR_MORA', 'LIBERADO_DEFINITIVO');
create type public.estado_corte_gps   as enum ('SIN_GPS', 'HABILITADO', 'CORTADO_POR_MORA', 'RETIRADO');
create type public.estado_solicitud   as enum ('NUEVA', 'CONTACTADA', 'EVALUADA', 'CONVERTIDA', 'DESCARTADA');
create type public.servicio_solicitud as enum ('CREDITO_VEHICULAR', 'CREDITO_CELULAR', 'PRESTAMO_EFECTIVO', 'OTRO');
create type public.parentesco         as enum ('CONYUGE', 'FAMILIAR', 'AMIGO', 'COMPANERO_PARADERO', 'OTRO');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.tg_actualizar_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Organización y usuarios internos
-- -----------------------------------------------------------------------------
create table public.sucursal (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  direccion   text,
  distrito    text,
  provincia   text,
  departamento text,
  telefono    text,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Perfil del personal. La autenticación la maneja Supabase Auth (auth.users);
-- aquí solo se guarda el rol y los datos internos.
create table public.perfil_usuario (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombres     text not null,
  apellidos   text not null default '',
  rol         public.rol_usuario not null default 'ASESOR_VENTAS',
  sucursal_id uuid references public.sucursal (id),
  telefono    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Parámetros globales (tope TEA, feriados, penalidades por defecto, etc.)
create table public.configuracion (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text,
  publica     boolean not null default false,   -- true = la web pública puede leerla
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

-- Tasa por defecto de cada servicio (editable desde el panel).
-- Un crédito guarda SU propia copia de la tasa: cambiar esta tabla no altera créditos firmados.
create table public.tasa_servicio (
  id                 uuid primary key default gen_random_uuid(),
  servicio           public.tipo_credito not null,
  categoria          public.categoria_producto,           -- null = aplica a todo el servicio
  nombre             text not null,
  frecuencia         public.frecuencia_pago not null,
  tipo_calculo       public.tipo_calculo not null default 'FLAT',
  tasa_porcentaje    numeric(7,3) not null check (tasa_porcentaje >= 0),  -- FLAT: % total del plazo · FRANCES: % por periodo
  cuotas_min         int not null default 1 check (cuotas_min > 0),
  cuotas_max         int not null default 52 check (cuotas_max >= cuotas_min),
  penalidad_diaria   numeric(12,2) not null default 0 check (penalidad_diaria >= 0),
  publica            boolean not null default false,       -- true = se usa en los simuladores de la web
  activa             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index tasa_servicio_unica_activa
  on public.tasa_servicio (servicio, categoria, frecuencia) nulls not distinct where activa;

-- -----------------------------------------------------------------------------
-- Clientes (KYC) y garantes
-- -----------------------------------------------------------------------------
create table public.cliente (
  id                     uuid primary key default gen_random_uuid(),
  nombres                text not null,
  apellidos              text not null,
  tipo_documento         public.tipo_documento not null default 'DNI',
  numero_documento       text not null,
  fecha_nacimiento       date,
  sexo                   public.sexo,
  estado_civil           public.estado_civil,
  -- Contacto
  telefono               text,
  telefono_secundario    text,
  email                  citext,
  -- Domicilio
  direccion              text,
  urbanizacion           text,
  distrito               text,
  provincia              text,
  departamento           text,
  referencia             text,
  tipo_vivienda          public.tipo_vivienda,
  latitud                numeric(9,6),
  longitud               numeric(9,6),
  -- Laboral / negocio
  ocupacion              text,
  direccion_trabajo      text,
  ingreso_mensual        numeric(12,2) check (ingreso_mensual >= 0),
  -- Documentos (rutas dentro del bucket privado "kyc")
  foto_dni_anverso       text,
  foto_dni_reverso       text,
  recibo_servicio        text,
  foto_fachada           text,
  -- Perfil crediticio interno
  estado                 public.estado_cliente not null default 'NUEVO',
  score_interno          smallint check (score_interno between 1 and 5),  -- null = sin historial suficiente
  apto_prestamo_efectivo boolean not null default false,
  notas                  text,
  sucursal_id            uuid references public.sucursal (id),
  -- Trazabilidad de la migración
  legado_id              int unique,
  datos_incompletos      boolean not null default false,  -- marcado en la importación si faltan datos mínimos
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);
create index cliente_busqueda_idx on public.cliente (apellidos, nombres);
create index cliente_estado_idx on public.cliente (estado);

create table public.garante (
  id               uuid primary key default gen_random_uuid(),
  nombres          text not null,
  apellidos        text not null,
  tipo_documento   public.tipo_documento not null default 'DNI',
  numero_documento text not null,
  telefono         text,
  direccion        text,
  parentesco       public.parentesco,
  foto_dni_anverso text,
  foto_dni_reverso text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);

-- -----------------------------------------------------------------------------
-- Catálogo público (lo que se muestra en la web)
-- -----------------------------------------------------------------------------
create table public.producto_catalogo (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  categoria        public.categoria_producto not null,
  marca            text not null,
  modelo           text not null,
  nombre           text not null,
  descripcion      text,
  precio_contado   numeric(12,2) not null check (precio_contado >= 0),
  specs            jsonb not null default '{}'::jsonb,
  etiquetas        text[] not null default '{}',
  destacado        boolean not null default false,
  publicado        boolean not null default false,
  orden            int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index producto_catalogo_publicado_idx on public.producto_catalogo (categoria, orden) where publicado;

create table public.imagen_producto (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.producto_catalogo (id) on delete cascade,
  url         text not null,
  alt         text,
  orden       int not null default 0,
  es_portada  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index imagen_producto_producto_idx on public.imagen_producto (producto_id, orden);
create unique index imagen_producto_una_portada on public.imagen_producto (producto_id) where es_portada;

-- Planes publicables por producto (ej. "Inicial S/ 1,500 · 18 cuotas mensuales").
-- El admin define la tasa (el sistema calcula la cuota) o la cuota fija (el sistema calcula la tasa).
create table public.plan_credito (
  id               uuid primary key default gen_random_uuid(),
  producto_id      uuid not null references public.producto_catalogo (id) on delete cascade,
  nombre           text,
  cuota_inicial    numeric(12,2) not null default 0 check (cuota_inicial >= 0),
  numero_cuotas    int not null check (numero_cuotas > 0),
  frecuencia       public.frecuencia_pago not null,
  tipo_calculo     public.tipo_calculo not null default 'FLAT',
  tasa_porcentaje  numeric(7,3) check (tasa_porcentaje >= 0),
  monto_cuota      numeric(12,2) check (monto_cuota > 0),
  publicado        boolean not null default false,
  orden            int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (tasa_porcentaje is not null or monto_cuota is not null)
);
create index plan_credito_producto_idx on public.plan_credito (producto_id) where publicado;

-- -----------------------------------------------------------------------------
-- Inventario serializado (unidades físicas)
-- -----------------------------------------------------------------------------
create table public.unidad_vehiculo (
  id                  uuid primary key default gen_random_uuid(),
  producto_id         uuid references public.producto_catalogo (id),
  tipo_vehiculo       public.tipo_vehiculo not null default 'MOTO_LINEAL',
  marca               text not null,
  modelo              text not null,
  anio                int check (anio between 1990 and 2100),
  cilindrada_cc       numeric(7,2),
  color               text,
  condicion           public.condicion_unidad not null default 'NUEVO',
  precio_lista        numeric(12,2) not null check (precio_lista >= 0),
  -- Identificadores legales
  numero_motor        text not null unique,
  numero_chasis       text not null unique,            -- VIN / serie
  placa               text unique,                      -- null = en trámite SUNARP
  tarjeta_propiedad   text,
  -- GPS y corta-corriente
  proveedor_gps       text,
  imei_gps            text,
  sim_gps             text,
  estado_gps          public.estado_corte_gps not null default 'SIN_GPS',
  estado              public.estado_unidad not null default 'EN_STOCK',
  sucursal_id         uuid references public.sucursal (id),
  notas               text,
  legado_id           int unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index unidad_vehiculo_estado_idx on public.unidad_vehiculo (estado, producto_id);

create table public.unidad_celular (
  id                  uuid primary key default gen_random_uuid(),
  producto_id         uuid references public.producto_catalogo (id),
  marca               text not null,
  modelo              text not null,
  almacenamiento      text,          -- ej. 256 GB
  memoria_ram         text,          -- ej. 8 GB
  color               text,
  sistema_operativo   public.sistema_operativo,
  condicion           public.condicion_unidad not null default 'NUEVO',
  precio_lista        numeric(12,2) not null check (precio_lista >= 0),
  imei1               text not null unique,
  imei2               text,
  numero_serie        text,
  plataforma_bloqueo  public.plataforma_bloqueo not null default 'NINGUNA',
  id_enrolamiento     text,           -- id en PayJoy/Knox o cuenta iCloud vinculada
  estado_bloqueo      public.estado_bloqueo not null default 'DESBLOQUEADO_OPERATIVO',
  estado              public.estado_unidad not null default 'EN_STOCK',
  sucursal_id         uuid references public.sucursal (id),
  notas               text,
  legado_id           int unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index unidad_celular_estado_idx on public.unidad_celular (estado, producto_id);

-- -----------------------------------------------------------------------------
-- Créditos, cuotas y pagos
-- -----------------------------------------------------------------------------
create sequence public.credito_codigo_seq;

create table public.credito (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique,           -- ej. JP-2026-000123
  tipo                   public.tipo_credito not null,
  cliente_id             uuid not null references public.cliente (id),
  garante_id             uuid references public.garante (id),
  unidad_vehiculo_id     uuid unique references public.unidad_vehiculo (id),
  unidad_celular_id      uuid unique references public.unidad_celular (id),
  plan_credito_id        uuid references public.plan_credito (id),
  sucursal_id            uuid references public.sucursal (id),
  creado_por             uuid references auth.users (id),
  -- Condiciones pactadas (copia congelada al firmar)
  monto_total            numeric(12,2) not null check (monto_total > 0),   -- precio del bien o capital prestado
  cuota_inicial          numeric(12,2) not null default 0 check (cuota_inicial >= 0),
  monto_financiado       numeric(12,2) generated always as (monto_total - cuota_inicial) stored,
  tasa_porcentaje        numeric(7,3) not null check (tasa_porcentaje >= 0),
  tipo_calculo           public.tipo_calculo not null default 'FLAT',
  total_intereses        numeric(12,2) not null check (total_intereses >= 0),
  monto_total_pagar      numeric(12,2) not null,
  frecuencia             public.frecuencia_pago not null,
  numero_cuotas          int not null check (numero_cuotas > 0),
  valor_cuota            numeric(12,2) not null check (valor_cuota > 0),
  penalidad_diaria       numeric(12,2) not null default 0 check (penalidad_diaria >= 0),
  tea_porcentaje         numeric(9,2),                    -- TEA calculada al firmar (transparencia)
  -- Fechas
  fecha_desembolso       date not null default current_date,
  fecha_primer_vencimiento date not null,
  fecha_cancelacion      date,
  estado                 public.estado_credito not null default 'VIGENTE',
  motivo_anulacion       text,
  contrato_pdf           text,
  notas                  text,
  legado_origen          text check (legado_origen in ('loans_prestamo', 'devices_devicesale', 'contracts_contratomoto')),
  legado_id              int,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (cuota_inicial < monto_total),
  check (monto_total_pagar = monto_total - cuota_inicial + total_intereses),
  check (tipo <> 'CREDITO_VEHICULAR' or unidad_celular_id is null),
  check (tipo <> 'CREDITO_CELULAR'   or unidad_vehiculo_id is null),
  check (tipo <> 'PRESTAMO_EFECTIVO' or (unidad_vehiculo_id is null and unidad_celular_id is null and cuota_inicial = 0)),
  check (estado <> 'ANULADO' or motivo_anulacion is not null),
  unique (legado_origen, legado_id)
);
create index credito_cliente_idx on public.credito (cliente_id);
create index credito_estado_idx on public.credito (estado, tipo);

create table public.cuota (
  id                uuid primary key default gen_random_uuid(),
  credito_id        uuid not null references public.credito (id) on delete cascade,
  numero            int not null check (numero > 0),
  fecha_vencimiento date not null,
  monto_cuota       numeric(12,2) not null check (monto_cuota >= 0),
  capital           numeric(12,2) not null default 0,
  interes           numeric(12,2) not null default 0,
  mora              numeric(12,2) not null default 0 check (mora >= 0),
  monto_pagado      numeric(12,2) not null default 0 check (monto_pagado >= 0),
  saldo_capital     numeric(12,2),                         -- saldo de capital después de esta cuota
  fecha_pago        date,                                  -- fecha en que quedó totalmente pagada
  estado            public.estado_cuota not null default 'PENDIENTE',
  legado_id         int,
  updated_at        timestamptz not null default now(),
  unique (credito_id, numero),
  check (capital + interes = monto_cuota)
);
create index cuota_cobranza_idx on public.cuota (fecha_vencimiento) where estado <> 'PAGADA';

create table public.pago (
  id                uuid primary key default gen_random_uuid(),
  credito_id        uuid not null references public.credito (id),
  monto             numeric(12,2) not null check (monto > 0),
  metodo            public.metodo_pago not null default 'EFECTIVO',
  numero_operacion  text,
  voucher           text,                                  -- ruta en el bucket privado "vouchers"
  fecha_pago        date not null default current_date,
  registrado_por    uuid references auth.users (id),
  anulado           boolean not null default false,
  motivo_anulacion  text,
  notas             text,
  created_at        timestamptz not null default now(),
  check (not anulado or motivo_anulacion is not null)
);
create index pago_credito_idx on public.pago (credito_id, fecha_pago);
create index pago_fecha_idx on public.pago (fecha_pago) where not anulado;

-- Un pago puede cubrir varias cuotas (adelantos) y se separa en mora / interés / capital.
create table public.aplicacion_pago (
  id        uuid primary key default gen_random_uuid(),
  pago_id   uuid not null references public.pago (id) on delete cascade,
  cuota_id  uuid not null references public.cuota (id),
  mora      numeric(12,2) not null default 0 check (mora >= 0),
  interes   numeric(12,2) not null default 0 check (interes >= 0),
  capital   numeric(12,2) not null default 0 check (capital >= 0),
  total     numeric(12,2) generated always as (mora + interes + capital) stored,
  unique (pago_id, cuota_id)
);
create index aplicacion_pago_cuota_idx on public.aplicacion_pago (cuota_id);

-- Bloqueos de celular / cortes de GPS: quién, cuándo y por qué.
create table public.evento_bloqueo (
  id                 uuid primary key default gen_random_uuid(),
  credito_id         uuid not null references public.credito (id),
  unidad_vehiculo_id uuid references public.unidad_vehiculo (id),
  unidad_celular_id  uuid references public.unidad_celular (id),
  accion             text not null check (accion in ('BLOQUEAR', 'DESBLOQUEAR', 'LIBERAR', 'CORTAR_GPS', 'RESTABLECER_GPS')),
  motivo             text not null,
  realizado_por      uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  check ((unidad_vehiculo_id is null) <> (unidad_celular_id is null))
);

-- -----------------------------------------------------------------------------
-- Captación web
-- -----------------------------------------------------------------------------
create table public.solicitud_credito (
  id                  uuid primary key default gen_random_uuid(),
  servicio            public.servicio_solicitud not null,
  producto_id         uuid references public.producto_catalogo (id),
  producto_interes    text,
  nombres             text not null,
  apellidos           text not null,
  tipo_documento      public.tipo_documento not null default 'DNI',
  numero_documento    text not null,
  fecha_nacimiento    date,
  estado_civil        text,
  nivel_educacion     text,
  celular             text not null,
  email               citext,
  preferencia_contacto text,
  departamento        text,
  provincia           text,
  distrito            text,
  situacion_laboral   text,
  ingreso_mensual     numeric(12,2),
  monto_solicitado    numeric(12,2),
  cuota_inicial       numeric(12,2),
  datos_extra         jsonb not null default '{}'::jsonb,
  acepta_datos        boolean not null check (acepta_datos),   -- consentimiento Ley 29733
  origen              text not null default 'web',
  estado              public.estado_solicitud not null default 'NUEVA',
  asignado_a          uuid references auth.users (id),
  cliente_id          uuid references public.cliente (id),
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index solicitud_estado_idx on public.solicitud_credito (estado, created_at desc);

-- -----------------------------------------------------------------------------
-- Auditoría y caja
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  registro_id text not null,
  accion      text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  antes       jsonb,
  despues     jsonb,
  usuario_id  uuid,
  created_at  timestamptz not null default now()
);
create index audit_log_registro_idx on public.audit_log (tabla, registro_id, created_at desc);

create table public.cierre_caja (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null,
  usuario_id      uuid not null references auth.users (id),
  sucursal_id     uuid references public.sucursal (id),
  total_efectivo  numeric(12,2) not null default 0,
  total_digital   numeric(12,2) not null default 0,
  total_declarado numeric(12,2) not null default 0,
  diferencia      numeric(12,2) generated always as (total_declarado - total_efectivo - total_digital) stored,
  observaciones   text,
  created_at      timestamptz not null default now(),
  unique (fecha, usuario_id)
);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['perfil_usuario','tasa_servicio','cliente','garante','producto_catalogo','plan_credito',
                           'unidad_vehiculo','unidad_celular','credito','cuota','solicitud_credito']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.tg_actualizar_updated_at()',
                   t || '_updated_at', t);
  end loop;
end $$;
