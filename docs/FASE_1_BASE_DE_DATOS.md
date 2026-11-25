# Fase 1 · Base de datos (PostgreSQL en Railway) y migración del sistema anterior

Fecha: 2026-11-25

## 1. Decisiones

**Hosting: PostgreSQL en Railway** (proyecto `shimmering-spirit`, servicio `Postgres`, región us-east4), junto al sistema
anterior. Se eligió por costo frente a Supabase. Lo que Supabase traía y Railway no, y cómo se resuelve:

| Supabase | En Railway |
|---|---|
| Esquema `auth` y roles `anon`/`authenticated` | `20261125000000_compat_auth.sql` los crea (no-op en Supabase) |
| Login del personal (Supabase Auth) | Fase 2: Auth.js con credenciales contra `auth.users` (hash de contraseña) |
| Storage privado para DNI/recibos | Fase 3: bucket de Railway u otro almacenamiento S3 privado |
| API REST + service role | La web se conecta directo con `DATABASE_URL` (solo servidor) |
| Backups automáticos | Activar backups del volumen de Postgres en el panel de Railway |

**Migraciones SQL en lugar de Prisma**: la seguridad se apoya en Row Level Security (políticas, funciones
`security definer`, triggers), que Prisma no modela. Si más adelante se quiere Prisma para consultas tipadas,
basta `prisma db pull` sobre esta base.

## 2. Migraciones

| Archivo | Contenido |
|---|---|
| `20261125000000_compat_auth.sql` | Esquema `auth`, `auth.uid()` y roles cuando la base no es Supabase |
| `20261125000100_esquema_base.sql` | Enums (glosario único), 19 tablas, índices y triggers `updated_at` |
| `20261125000200_seguridad_rls.sql` | RLS en todas las tablas, funciones de rol y auditoría automática |
| `20261125000300_funciones_negocio.sql` | Código correlativo de crédito, reserva de unidades, `recalcular_estados()`, vistas `v_cobranza` y `v_resumen_cartera` |
| `20261125000400_datos_iniciales.sql` | Sucursal, configuración, tasas por servicio y catálogo público (14 productos) |

### Modelo (resumen)

```
cliente ──< credito >── garante
              │  ├── unidad_vehiculo  (motor, chasis/VIN, placa, GPS)   ── producto_catalogo ──< imagen_producto
              │  └── unidad_celular   (IMEI 1/2, S/N, bloqueo)          └──< plan_credito
              ├──< cuota  <── aplicacion_pago (mora / interés / capital) ──> pago
              └──< evento_bloqueo
solicitud_credito (web) · tasa_servicio · configuracion · perfil_usuario (auth.users) · sucursal · audit_log · cierre_caja
```

Correcciones del plan aplicadas (§1.3): importes en `numeric(12,2)` (E1), glosario único (E2), `tipo_calculo` FLAT/FRANCES (E3),
catálogo separado de unidades físicas (E4), `solicitud_credito` (E5), KYC completo y `garante` propio (E6),
enums de bloqueo/GPS + `evento_bloqueo` (E7), `pago` → `aplicacion_pago` → n cuotas (E8), score `null` por defecto (E9),
`audit_log` y `cierre_caja` (E10), `configuracion` (E11), `sucursal` (E12), `tasa_servicio` y `plan_credito` (E13).

### Seguridad (RLS)

| Quién | Puede |
|---|---|
| Web pública (`anon`) | Leer catálogo, imágenes y planes **publicados**, tasas marcadas `publica` y configuración pública. Nada más. |
| Personal con perfil activo | Leer todo lo operativo |
| `SUPERADMIN` | Sucursales, personal, configuración, borrar registros, leer auditoría |
| `ADMIN_CREDITOS` | Tasas, créditos, cuotas, corregir/anular pagos |
| `ASESOR_VENTAS` | Clientes, garantes, catálogo, planes, inventario |
| `COBRADOR` | Registrar pagos y bloqueos a su nombre, su cierre de caja |

Las solicitudes de la web se insertan desde `/api/solicitudes` con el usuario dueño de la base (solo servidor, no sujeto a RLS).
Para que el RLS aplique a un usuario del panel, la app ejecuta en cada transacción
`set local role authenticated` y `select set_config('app.usuario_id', '<uuid>', true)`.
Los créditos nunca se borran: se anulan con motivo. Cambios en tasas, configuración, créditos, pagos, bloqueos y personal quedan en `audit_log`.

## 3. Migración del backup (`prestamos_backup.sql`)

Origen: base Django + MySQL (volcado HeidiSQL). Se transforma con:

```bash
python3 database/importar_legado.py RUTA/prestamos_backup.sql
# → database/.legado/legado.sql (ignorado por git: contiene datos personales)
```

y el SQL resultante se ejecuta una sola vez sobre la base ya migrada (es idempotente: UUID deterministas + `on conflict do nothing`).

| Origen | Destino | Registros |
|---|---|---|
| `users_client` | `cliente` | 93 |
| `inventory_moto` | `unidad_vehiculo` | 3 |
| `devices_device` | `unidad_celular` | 14 |
| `loans_prestamo` | `credito` (PRESTAMO_EFECTIVO) | 145 |
| `devices_devicesale` | `credito` (CREDITO_CELULAR) | 10 |
| `loans_cuotaprestamo` + `devices_deviceinstallment` | `cuota` / `pago` / `aplicacion_pago` | 985 / 912 / 912 |

Resultado verificado en un Postgres 16 local y luego en Railway: 24 préstamos activos (7 en mora),
131 créditos finalizados, saldo por cobrar S/ 16,665.00, 0 descuadres entre pagos y su aplicación.

### Hallazgos de calidad de datos

1. **Cabecera ≠ cronograma en 20 préstamos**: la cabecera decía 10% de interés, pero las cuotas cobradas suman 20%.
   Se usó el cronograma real y se dejó una nota en cada crédito.
2. **17 cuotas pagadas por encima de su monto**: el excedente se registró como mora cobrada.
3. **Datos de relleno en clientes**: 50 documentos `OLD-xxxx`, correos compartidos entre varios clientes y domicilios
   que solo dicen "Santa Anita". 92 de 93 clientes quedan con `datos_incompletos = true` para completarlos desde el panel.
4. **Contraseña de iCloud en texto plano** en una venta de celular: **no se importó**. Solo se guarda el correo de iCloud
   como cuenta de bloqueo. Se recomienda que la empresa deje de anotar contraseñas de clientes.
5. Un IMEI con 14 dígitos (celular legado #8): importado, revisar.
6. No se migran `auth_user` ni sesiones de Django: el personal se crea de nuevo en Supabase Auth.

### Score y estado de clientes

`recalcular_estados()` (para un job diario) marca cuotas vencidas, actualiza estados de crédito y calcula para cada cliente
un score 1–5 según la puntualidad de sus cuotas pagadas (tolerancia `configuracion.dias_gracia_mora` = 3 días, porque la
mayoría de pagos llega entre 0 y 3 días tras el vencimiento). Con los datos actuales: 24 clientes "excelente pagador",
33 aptos para préstamo en efectivo.

## 4. Estado en Railway (2026-11-25)

**Hecho:**
1. Servicio `Postgres` (PostgreSQL 18) creado en el proyecto del sistema anterior, con acceso público por TCP (SSL) para Vercel.
2. Migraciones aplicadas y datos copiados **directo del MySQL en vivo** por la red privada, con una Railway Function
   temporal (`database/railway/migrar.ts`). Resultado: 93 clientes, 155 créditos, 985 cuotas, 912 pagos, 14 productos.
   La función se eliminó al terminar; los logs solo contienen conteos.
3. El sistema anterior (`prestamos` + `MySQL`) **no se tocó** y sigue funcionando.

**Pendiente:**
1. En Vercel, `DATABASE_URL` = valor de `DATABASE_PUBLIC_URL` del servicio Postgres en Railway (solo servidor).
2. Activar backups del volumen de Postgres en Railway.
3. Fijar `configuracion.tope_tea_porcentaje` con el área legal.
4. **Corte del sistema anterior**: mientras se siga usando, los pagos nuevos quedan solo en MySQL. El día del cambio,
   volver a ejecutar la función con `IMPORTAR_LEGADO=1`: agrega los registros nuevos, pero **no actualiza** los ya copiados
   (por ejemplo, una cuota pagada después de hoy). Para ese corte conviene vaciar las tablas operativas y recargar.

### Volver a ejecutar la migración

```bash
python3 database/railway/construir_funcion.py --remoto <commit con las migraciones>
# crear una Railway Function con database/railway/dist/funcion.ts y las variables:
#   DATABASE_URL=${{Postgres.DATABASE_URL}}  MYSQL_URL=${{MySQL.MYSQL_URL}}  IMPORTAR_LEGADO=1
```

Sin Railway Function también se puede usar el backup: `python3 database/importar_legado.py backup.sql` y ejecutar
`database/.legado/legado.sql` con `psql` sobre la URL pública.

## 5. Rediseño de la web

La web deja de ser una tienda de motos y pasa a presentarse como **financiera multiservicio**:

- Nueva identidad: fondo claro, azul institucional + verde para acciones/montos, tipografía Plus Jakarta Sans y logotipo SVG.
- Portada: simulador de cuotas (vehículo / celular) con TEA visible, servicios, pasos, frecuencias de pago, productos, requisitos y FAQ.
- Nuevas páginas: `/prestamos` (selector de monto, sin tasa publicada) y `/celulares` (catálogo con cuota semanal).
- `/motos` presentado como **crédito vehicular**; incluye el Honda Motokar GL150 del inventario real.
- Formulario único para los 3 servicios; `/api/solicitudes` guarda en `solicitud_credito` (PostgreSQL) y avisa por correo.

Pendiente para la Fase 2: leer catálogo y tasas desde la base de datos en la web, panel `/admin` con login, fotos reales de celulares,
páginas legales y Libro de Reclamaciones.
