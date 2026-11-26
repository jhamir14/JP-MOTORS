# Fase 9 · Endurecimiento y salida a producción

Fecha: 2026-11-26

## 1. Permisos por rol

Matriz única en `src/lib/permisos.ts`: el menú muestra solo lo que el rol puede abrir y cada página lo exige con `requerirSeccion()`
(si no, vuelve a `/admin` con «Tu rol no tiene acceso»). Las acciones (crear, anular, editar) mantienen sus propios roles y la base aplica RLS.

| Sección | Superadmin | Admin. créditos | Asesor de ventas | Cobrador |
|---|:-:|:-:|:-:|:-:|
| Inicio, Clientes, Créditos, Cobranzas, Pagos, Caja | ✔ | ✔ | ✔ | ✔ |
| Reportes e indicadores financieros | ✔ | ✔ | — | — |
| Solicitudes web, Catálogo, Inventario, Tasas, Libro de Reclamaciones | ✔ | ✔ | ✔ | — |
| Personal, Sistema | ✔ | — | — | — |

Cambio respecto a fases anteriores: el **cobrador** ya no ve Solicitudes, Catálogo, Inventario, Tasas ni Reclamos (no los necesita para cobrar).

## 2. Rate-limit compartido

`limite_intento` + `registrar_intento()` en PostgreSQL: el límite vale para todas las instancias de Vercel (antes era por instancia).
La clave se guarda como SHA-256 (sin IPs ni correos). Si la base falla, se usa el contador en memoria.

| Acción | Límite |
|---|---|
| Login | 10 por IP y 5 por correo cada 15 min (se reinicia al ingresar) |
| Solicitud de financiamiento (nuevo) | 5 por IP por hora |
| Libro de Reclamaciones | 5 por IP por hora |
| Recibo público `/r/<token>` | 30 por IP cada 10 min |
| Exportar reportes | 30 por usuario cada 10 min |
| Reporte de errores del navegador | 20 por IP cada 10 min |

## 3. Monitoreo de errores

- `src/instrumentation.ts` (`onRequestError`) guarda cada error del servidor en `error_app`; las pantallas `error.tsx` del panel y de la web
  envían los del navegador a `/api/errores`. Se quitan **datos personales** (DNI, teléfonos, correos, tokens, cadenas de conexión, query e ids de la URL)
  y se conservan los últimos 5 000. `redirect()`/`notFound()` no cuentan como error.
- **`/admin/sistema`** (Superadmin): base conectada, proceso diario al día, errores 24 h / 7 días con detalle, sesiones activas, versión de la base
  (qué migraciones faltan), intentos de rate-limit de la última hora y **descargas de reportes** con usuario.
- Monitoreo externo: apuntar UptimeRobot (gratis) a `https://<dominio>/api/salud` cada 5 minutos con aviso por correo.

## 4. Cabeceras de seguridad

`next.config.ts`: HSTS (2 años), `X-Content-Type-Options`, `X-Frame-Options` (DENY en el panel), CSP `frame-ancestors`/`base-uri`/`object-src`,
`Referrer-Policy`, `Permissions-Policy` (cámara y ubicación solo para el propio sitio) y sin `X-Powered-By`.
No se activa una CSP de scripts completa por Google Tag Manager / GA4.

## 5. Respaldos

- **Automáticos**: backups del volumen de PostgreSQL en Railway (diario, semanal y mensual; activados en la Fase 1). Restaurar: Railway → Postgres → Backups.
- **Copia lógica** (antes de cambios grandes o una vez al mes, guardada cifrada fuera del repo):
  ```bash
  DATABASE_URL="<DATABASE_PUBLIC_URL de Railway>" ./database/respaldo.sh
  ```
  Probar la restauración en una base de prueba con `pg_restore --clean --if-exists --no-owner -d <destino> archivo.dump`.

## 6. Base de datos

Migración `database/migrations/20261204000100_fase9_endurecimiento.sql` (idempotente): `limite_intento`, `registrar_intento()`, `reiniciar_intentos()`,
`error_app` (RLS: solo Superadmin), `registrar_error()` e índice de `audit_log` por acción. Ninguna función es ejecutable por `anon` ni `authenticated`.

### Aplicar las migraciones 8 y 9 en Railway

La app ya desplegada funciona sin ellas (muestra avisos y usa el rate-limit en memoria), pero los reportes se activan al aplicarlas.
Opción A — desde una terminal con el cliente de PostgreSQL (URL pública del servicio Postgres):
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f database/migrations/20261203000100_fase8_reportes.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f database/migrations/20261204000100_fase9_endurecimiento.sql
psql "$DATABASE_URL" -c "insert into public._migraciones (nombre) values ('20261203000100_fase8_reportes'), ('20261204000100_fase9_endurecimiento') on conflict do nothing"
```
Opción B — Railway Function temporal (procedimiento de la Fase 6): descarga cada SQL de GitHub fijado a un commit, verifica su SHA-256,
lo aplica en una transacción y lo registra en `_migraciones`; se elimina después. Comprobar en `/admin/sistema` → «Versión de la base».

## 7. Checklist de salida a producción

- [ ] Migraciones 8 y 9 aplicadas (`/admin/sistema` sin «falta»).
- [ ] En Vercel: `DATABASE_URL` (solo Production), `NEXT_PUBLIC_SITE_URL` con el dominio definitivo, `LEADS_EMAIL`.
- [ ] Dominio propio en Vercel con HTTPS; redirigir el dominio anterior.
- [ ] Contraseña fuerte y única del Superadmin; un usuario por persona (no compartir cuentas); desactivar a quien salga.
- [ ] Monitoreo de `/api/salud` (UptimeRobot) y revisar `/admin/sistema` una vez por semana.
- [ ] Primer respaldo lógico con `respaldo.sh` y prueba de restauración.
- [ ] Validación legal: contratos, pagaré, cláusula de bloqueo, `/privacidad` y `/terminos`; representante legal y domicilio en `/admin/tasas`.
- [ ] Registro del banco de datos personales ante la ANPDP (Ley 29733) y responsable de datos designado.
- [ ] Carga de datos reales (sección 8) y capacitación ([`MANUAL_DEL_PANEL.md`](MANUAL_DEL_PANEL.md)).

## 8. Carga de datos reales

1. Clientes y créditos del sistema anterior: ya migrados (Fase 1). Revisar `/admin/clientes?incompletos=1` y completar expedientes.
2. Inventario real: registrar cada unidad en `/admin/inventario` (motor, chasis/VIN, GPS; IMEI y plataforma de bloqueo).
3. Tasas, planes, feriados y beneficios por score en `/admin/tasas` y `/admin/catalogo`.
4. Personal en `/admin/personal` con el rol justo (ver sección 1). Sucursales: si hay más de una, crearlas y asignarlas para que los filtros sirvan.
5. Créditos nuevos solo desde el panel (cronograma y contratos se generan solos).

## 9. Verificación

Pruebas unitarias de permisos, sanitización de errores y exportación; en local: login bloqueado al 6.º intento con el contador en
PostgreSQL, error del navegador guardado sin DNI ni correo, cabeceras presentes, y panel funcionando **sin** las migraciones 8/9 (avisos) y con ellas.
