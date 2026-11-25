# Fase 3 · Clientes, garantes y documentos KYC

Fecha: 2026-11-25

## 1. Qué incluye

| Ruta | Quién edita | Qué hace |
|---|---|---|
| `/admin/clientes` | — | Listado con búsqueda por documento (acepta puntos y espacios), nombre, apellido o celular; filtros por estado y **«Datos incompletos»**; paginación de 50 |
| `/admin/clientes/nuevo` | Superadmin, Admin. créditos, Asesor | Alta con lo mínimo (nombre, documento, celular). Con `?solicitud=<id>` se prellena desde la solicitud web |
| `/admin/clientes/[id]` | (ver abajo) | **Ficha 360°**: estado, score, pendientes del expediente, datos personales, domicilio y GPS, documentos privados, garantes, créditos con su cronograma (solo lectura), solicitudes vinculadas e historial de auditoría (solo Superadmin) |
| `/admin/clientes/[id]/editar` | Superadmin, Admin. créditos, Asesor | Edición del KYC completo |
| `/api/kyc/<id>` | — | Descarga de un documento privado (con sesión y rol; queda auditada) |

### Expediente completo
`src/lib/clientes.ts → faltantesCliente()` define qué es un expediente completo: documento válido, fecha de nacimiento, sexo, estado civil,
celular, dirección con distrito/provincia/departamento, referencia, tipo de vivienda, **ubicación GPS**, ocupación, ingreso mensual y las fotos de
**DNI (anverso y reverso), recibo de servicio y fachada**. La ficha muestra lo que falta y `cliente.datos_incompletos` se recalcula en cada
cambio (datos, ubicación o documentos), así que el filtro del listado y el indicador del inicio siempre están al día.

Los clientes migrados con documento provisional (`SIN-DOC-n`) se pueden editar sin corregir el documento en el momento; queda marcado como pendiente.

### Validaciones y duplicados
- DNI 8 dígitos, carné de extranjería 9, pasaporte 6–12 alfanuméricos, **RUC 11 dígitos con dígito verificador (módulo 11 de SUNAT)**; celular peruano de 9 dígitos.
- Al crear o editar se busca otro cliente con el **mismo documento o su equivalente** (el RUC 10 de una persona contiene su DNI). Si existe, no se guarda y se ofrece el enlace a su ficha.
- Garantes: si el documento ya existe se **reutiliza** el registro (un garante puede respaldar a varios clientes); el cliente no puede ser su propio garante.

### Solicitudes web → cliente
En `/admin/solicitudes` cada solicitud tiene **«Convertir en cliente»** (prellena nombre, documento, nacimiento, estado civil, celular, correo,
ubicación, actividad e ingreso). Al registrar, la solicitud pasa a `CONVERTIDA` con su `cliente_id`. Si la persona ya era cliente se ofrece
**«vincular»** la solicitud a su ficha en lugar de duplicarla. El estado «Convertida» ya no se puede poner a mano sin cliente vinculado.

### Geolocalización
Desde el celular del asesor, en la ficha: **«Registrar ubicación (estoy en el domicilio)»** usa `navigator.geolocation` (alta precisión) y
guarda latitud, longitud, precisión en metros y fecha. Avisa si la precisión es baja (> 100 m) y rechaza coordenadas fuera del Perú.
El cobrador ve **«Ver en Google Maps»** y **«Cómo llegar»**. También se pueden escribir las coordenadas a mano en el formulario.
Requiere HTTPS (en producción lo es) y que el navegador autorice la ubicación.

### Bloqueo legal
Superadmin y Admin. de créditos pueden bloquear a un cliente (motivo obligatorio, queda en notas y auditoría). El proceso diario
`recalcular_estados` no toca a los clientes bloqueados; al levantar el bloqueo el estado se recalcula con su historial.

## 2. Documentos KYC privados

- Tabla **`documento_kyc`** (bytea) separada de `archivo`: **nunca** se sirve por `/api/archivos` (que es público para el catálogo).
- Se aceptan JPG, PNG, WEBP y PDF hasta 8 MB, validando el tipo real por los bytes. Las fotos grandes del celular se reducen en el navegador
  (JPEG, lado máximo 2000 px) antes de subirlas. DNI, recibo y fachada: uno vigente por tipo (subir otro lo reemplaza); «Otro» se acumula.
- Descarga solo por `/api/kyc/<id>`: exige sesión del panel y rol; responde **404** si no hay permiso (no revela qué existe);
  `Cache-Control: private, no-store`, `nosniff`, `noindex`. **Cada apertura se registra** en `audit_log` con `accion = 'DESCARGA'`, usuario e IP.
- En la base, el rol `authenticated` puede listar los metadatos pero **no tiene permiso sobre la columna `datos`**: los bytes solo salen por el endpoint auditado.
- El historial de la auditoría no copia los bytes (`tg_auditar_sin_datos`).

Se eligió la tabla privada en lugar de un bucket S3 para no sumar otro servicio ni credenciales: la protección real es que no hay URL pública
y cada acceso pasa por la sesión. Si el volumen crece (cientos de MB), se puede mover a un bucket privado con URLs firmadas sin cambiar la interfaz.

## 3. Permisos por rol

| Acción | Superadmin | Admin. créditos | Asesor | Cobrador |
|---|:-:|:-:|:-:|:-:|
| Ver listado y ficha | ✔ | ✔ | ✔ | ✔ |
| Crear/editar cliente, garantes, ubicación y documentos | ✔ | ✔ | ✔ | — |
| Ver DNI y recibo | ✔ | ✔ | ✔ | — |
| Ver fachada | ✔ | ✔ | ✔ | ✔ |
| Bloqueo legal | ✔ | ✔ | — | — |
| Historial de auditoría en la ficha | ✔ | — | — | — |

Las reglas viven en `src/lib/clientes.ts` (`puedeEditarKyc`, `puedeVerDocumento`, `puedeBloquearCliente`) y las políticas RLS aplican lo mismo en la base.

## 4. Base de datos

Migración `database/migrations/20261127000100_fase3_clientes.sql` (idempotente):
- `documento_kyc` (+ enum `tipo_documento_kyc`), RLS y permisos por columna.
- `cliente_garante` (vínculo reutilizable, con parentesco y notas). Se llena con los garantes que ya figuraban en créditos migrados.
- `cliente`: `geo_precision_m`, `geo_registrada_at`, `registrado_por` e índices de búsqueda.
- `audit_log` acepta `DESCARGA`; auditoría de `cliente`, `garante`, `cliente_garante`, `solicitud_credito` y `documento_kyc`.
- Las columnas `foto_*` / `recibo_servicio` de la Fase 1 quedan en desuso (los documentos viven en `documento_kyc`).

**Aplicada en Railway el 2026-11-25** (registrada en `public._migraciones`): 93 clientes, 92 con `datos_incompletos`.
Para otro entorno:
```bash
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f database/migrations/20261127000100_fase3_clientes.sql
```
Después, abrir y guardar cada cliente migrado no es necesario: `datos_incompletos` ya viene marcado desde la importación y se corrige al completar la ficha.

## 5. Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (54 pruebas; 18 nuevas: DNI/CE/pasaporte/RUC, duplicados DNI ↔ RUC 10, completitud, permisos por rol, coordenadas) y `npm run build`.
- Migración aplicada dos veces sobre PostgreSQL 16 local con todas las anteriores (idempotente).
- Prueba de punta a punta con Playwright (43 comprobaciones): búsqueda, conversión de solicitud con prellenado, vincular solicitud de un cliente existente,
  duplicado por DNI y por RUC 10, validación de DNI, edición de cliente migrado con `SIN-DOC`, GPS simulado, subida de PNG y PDF, rechazo de archivo falso,
  reemplazo de DNI, garante reutilizado entre clientes, cliente como su propio garante (rechazado), créditos y cuotas migrados, ficha móvil sin scroll horizontal,
  cobrador (sin edición, DNI → 404, fachada → 200, sin acceso a «nuevo»), acceso sin sesión (404), historial con la apertura del DNI y bloqueo legal.
- RLS comprobado en SQL con la identidad del cobrador: `update cliente` → 0 filas, `select datos from documento_kyc` → permiso denegado, vincular garante → rechazado.

## 6. Pendiente

- Alta de créditos desde la ficha (Fase 4) y registro de pagos (Fase 5).
- Consentimiento firmado del cliente para el tratamiento de datos y retención/eliminación de documentos según la política de privacidad (validar con el área legal).
