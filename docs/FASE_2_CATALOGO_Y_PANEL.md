# Fase 2 · Web pública desde la base de datos y panel administrativo

Fecha: 2026-11-25

## 1. Qué incluye

### Web pública
| Ruta | Qué hace |
|---|---|
| `/` | Simulador (vehículo / celular, tasas de la BD) y **selector Motos / Toritos / Celulares** con los destacados de cada línea |
| `/vehiculos` | Catálogo vehicular desde la BD con filtros por tipo, uso, precio y orden (en la URL) |
| `/vehiculos/[slug]` | Ficha con galería, especificaciones, **planes de crédito publicados** (cuota, total y TEA), simulador, JSON-LD y metadatos SEO |
| `/vehiculos/torito-bajaj` | Landing de mototaxis y trimóviles (muestra los Bajaj del catálogo o, si no hay, los trimóviles) |
| `/celulares`, `/celulares/[slug]` | Catálogo y ficha de celulares; simulador **semanal o quincenal** |
| `/repuestos` | Repuestos desde la BD (antes estaban en el código) |
| `/libro-reclamaciones` | Hoja de reclamación virtual con código correlativo `LR-AAAA-NNNNNN` |
| `/privacidad`, `/terminos` | Textos base (**deben validarse con el área legal**) |

- `/motos` y `/motos/<id>` redirigen (301) a `/vehiculos` y a la ficha nueva: no se pierden enlaces de campañas.
- Páginas con ISR (5 min) y se regeneran **al instante** cuando se guarda algo en el panel.
- Sin `DATABASE_URL` (CI, desarrollo) o si la BD falla, se usa `src/data/catalogoRespaldo.ts` (espejo de las migraciones).
- `lib/finance.ts`: `calcularCredito` (FRANCÉS / FLAT, por tasa o por cuota fija), `tasaImplicita`, TEA y `cronograma` con ajuste de redondeo en la última cuota. Lo usan los simuladores, las fichas y el panel: siempre dan el mismo resultado.

### Panel `/admin`
| Sección | Roles que editan | Qué hace |
|---|---|---|
| Inicio | — | Solicitudes nuevas, cuotas que vencen hoy, productos publicados, stock, reclamos abiertos y cartera por tipo |
| Solicitudes web | todo el personal | Bandeja de `/financiamiento`: datos, WhatsApp/llamada, estado y notas internas |
| Catálogo | Superadmin, Admin. créditos, Asesor | Alta/edición de productos, especificaciones, etiquetas, destacado/publicado, **fotos** (portada, eliminar) y **planes de crédito** con vista previa de cuota y TEA |
| Inventario | Superadmin, Admin. créditos, Asesor | Ingreso de motos/trimóviles (motor, VIN de 17, placa, GPS) y celulares (IMEI con Luhn, serie, plataforma de bloqueo); cambio de estado |
| Tasas por servicio | Superadmin, Admin. créditos | Tasa, tipo de cálculo, cuotas mín./máx., penalidad, uso en la web; **tope de TEA** (solo Superadmin) |
| Libro de Reclamaciones | Superadmin, Admin. créditos | Respuesta, estado y conteo de días hábiles (alerta desde el día 10, vencido después del 15) |
| Personal | Superadmin | Crear cuentas, cambiar rol, desactivar, restablecer contraseña |

## 2. Seguridad

- **Login propio** (sin dependencias): contraseñas con `scrypt`; sesión con token aleatorio de 256 bits en cookie `httpOnly`/`Secure`/`SameSite=Lax`, en la BD solo su SHA-256 (`sesion_panel`), 12 h de duración. Desactivar a una persona o cambiar su contraseña cierra sus sesiones.
- `src/proxy.ts` bloquea `/admin/*` sin cookie y marca las respuestas `noindex` y `no-store`; cada página y acción vuelve a validar la sesión y el rol.
- Las escrituras del panel corren con `set local role authenticated` + `app.usuario_id`: **aplican las políticas RLS de la Fase 1** y `audit_log` registra quién hizo cada cambio.
- Límite de intentos: login (10 por IP y 5 por correo cada 15 min) y Libro de Reclamaciones (5 por IP por hora). Es por instancia; la Fase 9 contempla uno compartido.
- Fotos: se valida el tipo real por los bytes (JPG, PNG, WEBP, AVIF) y 5 MB máx. Se sirven en `/api/archivos/<id>` solo si el producto está publicado (el personal ve también las de borradores).
- Plan con TEA mayor al `tope_tea_porcentaje` configurado: el panel no lo guarda.

## 3. Base de datos

Nueva migración `database/migrations/20261126000100_fase2_panel.sql` (idempotente):
`sesion_panel`, `archivo`, `reclamo` (+ secuencia, auditoría y RLS), vista `v_stock_producto`, permisos de borrado de fotos y planes para ventas,
21 repuestos en el catálogo y planes de ejemplo (vehículos: 20 % de inicial, 12 y 24 meses al 2 % mensual; celulares: 16 semanas sin inicial al 1.2 % semanal).

## 4. Puesta en marcha

1. Aplicar la migración en Railway (igual que las de la Fase 1):
   ```bash
   psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f database/migrations/20261126000100_fase2_panel.sql
   ```
2. En Vercel: `DATABASE_URL` (URL pública de Railway), `LEADS_EMAIL`, y opcionalmente `NEXT_PUBLIC_RUC` y `NEXT_PUBLIC_EMAIL_CONTACTO`.
3. Crear el primer superadministrador (la contraseña se pide por consola):
   ```bash
   cd frontend
   DATABASE_URL="$DATABASE_PUBLIC_URL" npm run admin:crear -- correo@empresa.com "Nombres" "Apellidos" SUPERADMIN
   ```
4. Ingresar en `/admin/login`, crear al resto del personal en **Personal** y fijar el **tope de TEA** con el área legal.

## 5. Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (37 pruebas: finanzas, validaciones de VIN/IMEI/placa, solicitud) y `npm run build` con y sin base de datos.
- Prueba de punta a punta con Playwright contra PostgreSQL 16 local con todas las migraciones: páginas públicas, reclamo con código,
  login (incluye contraseña incorrecta), alta de producto publicado, subida de foto, plan por cuota fija, ficha pública con el plan,
  ingreso de unidad (rechaza VIN corto) y de celular (rechaza IMEI con Luhn inválido), «En stock» en la web, edición de tasa,
  respuesta de reclamo, asesor sin acceso a Personal y con tasas en solo lectura, y portada móvil sin scroll horizontal.
  La auditoría registró al usuario del panel en cada cambio.

## 6. Pendiente para fases siguientes

- Convertir una solicitud en cliente (Fase 3) y créditos/cobranzas (Fases 4–5): el panel ya muestra las cuotas que vencen hoy, pero aún no se registran pagos.
- Envío automático de la respuesta del reclamo por correo (hoy se marca como respondido y se envía desde el correo de la empresa).
- Fotos reales de celulares y del Torito Bajaj (se suben desde el panel).
- Validación legal de `/privacidad`, `/terminos` y del texto del Libro de Reclamaciones; completar el RUC.
