# Fase 1 · Base de datos en Supabase y migración del sistema anterior

Fecha: 2026-11-25

## 1. Decisión: migraciones SQL en lugar de Prisma

El plan v2 proponía Prisma. Se optó por **migraciones SQL nativas de Supabase** (`supabase/migrations/`) porque:

- La seguridad se apoya en **Row Level Security** de Postgres (políticas, funciones `security definer`, triggers), que Prisma no modela.
- Supabase CLI y el panel aplican estas migraciones directamente; no hay un paso de generación extra.
- Si más adelante se quiere Prisma para consultas tipadas, basta `prisma db pull` sobre esta base.

## 2. Migraciones

| Archivo | Contenido |
|---|---|
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

Las solicitudes de la web se insertan desde `/api/solicitudes` con la `service_role` key (solo servidor).
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

Resultado verificado en un Postgres 16 local (con stub del esquema `auth`): 24 préstamos activos (7 en mora),
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

## 4. Puesta en marcha en Supabase

1. Crear el proyecto (región `sa-east-1`, São Paulo).
2. Aplicar las 4 migraciones en orden (`supabase db push` o el editor SQL).
3. Generar y ejecutar `database/.legado/legado.sql`.
4. Crear los usuarios del personal en Auth y su fila en `perfil_usuario` con el rol.
5. En Vercel: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
6. Fijar `configuracion.tope_tea_porcentaje` con el área legal.

## 5. Rediseño de la web

La web deja de ser una tienda de motos y pasa a presentarse como **financiera multiservicio**:

- Nueva identidad: fondo claro, azul institucional + verde para acciones/montos, tipografía Plus Jakarta Sans y logotipo SVG.
- Portada: simulador de cuotas (vehículo / celular) con TEA visible, servicios, pasos, frecuencias de pago, productos, requisitos y FAQ.
- Nuevas páginas: `/prestamos` (selector de monto, sin tasa publicada) y `/celulares` (catálogo con cuota semanal).
- `/motos` presentado como **crédito vehicular**; incluye el Honda Motokar GL150 del inventario real.
- Formulario único para los 3 servicios; `/api/solicitudes` guarda en `solicitud_credito` y avisa por correo.

Pendiente para la Fase 2: leer catálogo y tasas desde Supabase en la web, panel `/admin` con login, fotos reales de celulares,
páginas legales y Libro de Reclamaciones.
