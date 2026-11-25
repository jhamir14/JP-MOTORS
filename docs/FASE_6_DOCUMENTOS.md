# Fase 6 · Documentos

Fecha: 2026-11-25

## 1. Qué incluye

| Ruta | Quién | Qué hace |
|---|---|---|
| `/admin/creditos/[id]` → panel **Documentos** | Superadmin, Admin. de créditos, Asesor de ventas | Botones **Contrato (PDF)**, **Pagaré (PDF)** y **Cronograma (PDF)**; lista de documentos firmados; subida del escaneo o foto (contrato, pagaré, cronograma firmado, acta de entrega, otro). Aviso «Falta subir el contrato firmado» en créditos nuevos |
| `/admin/creditos/[id]` (cobrador) | Cobrador | Solo **Cronograma (PDF)** y la lista de firmados (puede abrirlos). No ve contrato ni pagaré |
| `/admin/pagos/[id]` | Todo el personal | **Recibo PDF** y **Enviar recibo por WhatsApp** (enlace `wa.me` al celular del cliente con el texto y el enlace del recibo) |
| `/admin/tasas` → **Datos para contratos y recibos** | Superadmin (edita) | Representante legal, su documento, domicilio y ciudad de la empresa; casilla «Un abogado validó los textos» |
| `/api/documentos/credito/[id]/contrato\|pagare\|cronograma` | Con sesión (contrato y pagaré: roles de venta/admin) | PDF generado al vuelo. `?descargar=1` lo baja como archivo |
| `/api/documentos/pago/[id]` | Con sesión | Recibo en PDF |
| `/r/[token]` | **Público** (enlace de WhatsApp) | Recibo en PDF con el documento del cliente enmascarado (`DNI ••••4567`) |
| `/api/documentos-credito/[id]` | Con sesión | Descarga del documento firmado |

Todas las respuestas son `no-store`, `noindex` y responden **404** (no 403) cuando falta sesión o permiso. Cada generación o descarga queda en `audit_log` (`accion = 'DESCARGA'`, `despues.documento` = `CONTRATO`, `PAGARE`, `CRONOGRAMA`, `RECIBO`, `RECIBO_PUBLICO` o `FIRMADO`, con usuario e IP).

## 2. Documentos

Se generan en el servidor con **pdf-lib** (JavaScript puro, sin Chromium: funciona en Vercel) a partir de las condiciones **congeladas** del crédito.
No se guardan: lo que se archiva es lo **firmado**.

| Documento | Plantilla | Contenido principal |
|---|---|---|
| Contrato vehicular | `contratoVehicular` | Compraventa a plazos **con reserva de propiedad** (arts. 1583 y ss. C.C.): partes, vehículo (motor, chasis/VIN, placa o «en trámite»), precio e inicial en números y letras, forma de pago, TEA, obligaciones del cliente, **GPS y corta-corriente** (nunca con el vehículo en movimiento), penalidad con días de gracia y tope, resolución por 3 cuotas impagas (arts. 1430, 1561, 1563), fianza solidaria si hay garante, datos personales (Ley 29733), jurisdicción, firmas con huella y **Anexo 1: cronograma** |
| Contrato de celular | `contratoCelular` | Compraventa a plazos con reserva de propiedad, equipo (IMEI 1/2, serie), **cláusula de bloqueo con consentimiento expreso** (plataforma PayJoy/Knox/…; bloquear con cuotas vencidas tras aviso, desbloquear en 24 h, liberar al cancelar; no accede a fotos ni mensajes), garantía del fabricante, declaración firmada del cliente sobre el bloqueo |
| Contrato de mutuo | `contratoMutuo` | Para los préstamos en efectivo migrados del sistema anterior (arts. 1648 y ss. C.C.) |
| Pagaré | `pagare` | Ley N.° 27287: importe total a pagar en números y letras, emisión y vencimiento (última cuota), **cláusula sin protesto** (art. 52), prórroga, emitente y **aval** (el garante) con huella |
| Cronograma | `cronograma` | Cuotas con capital, interés, cuota, saldo de capital, **pagado y estado** al día de hoy, saldo pendiente. Marca de agua «ANULADO» si el crédito está anulado |
| Recibo de pago | `recibo` | N.° correlativo (`pago.numero_recibo`), monto en números y letras, fecha y hora (Lima), método, n.º de operación, cajero, reparto por cuota (mora / interés / capital), cuotas pagadas y saldo. «Constancia de pago: no es comprobante electrónico SUNAT». Marca de agua «ANULADO» si el pago se anuló |

Plantillas en `src/lib/documentos.ts` (funciones puras: arman bloques de texto, tablas y firmas) y dibujo en `src/lib/pdf/render.ts`
(A4, cabecera con empresa y RUC, pie con «Página x de y», negritas, tablas que repiten la cabecera en cada página, firmas con recuadro de huella).

**Textos legales:** son un **modelo referencial**. Mientras `configuracion.documentos_validados = false`, cada contrato y pagaré muestra
«Modelo referencial pendiente de validación legal». Cuando un abogado los revise, se ajustan los textos en `lib/documentos.ts` y el superadmin
marca la casilla en `/admin/tasas`. Si falta el representante o el domicilio de la empresa, el documento deja una línea `______` para completarla a mano.

### Recibo por WhatsApp
`wa.me` no permite adjuntar archivos: el mensaje lleva un **enlace al PDF** (`https://<dominio>/r/<token>`). El token es único por pago
(64 hex, ~244 bits aleatorios: no se puede adivinar ni recorrer), el DNI sale enmascarado, hay límite de 30 aperturas por IP cada 10 minutos
y cada apertura queda auditada. Un pago anulado deja de ofrecer el botón y su enlace muestra el recibo con la marca «ANULADO».

## 3. Base de datos

Migración `database/migrations/20261201000100_fase6_documentos.sql` (idempotente):

| Objeto | Qué hace |
|---|---|
| `configuracion.empresa_documentos` (privada) | `representante_legal`, `representante_documento`, `domicilio`, `ciudad` (Lima). `configuracion.empresa` es pública (la lee la web), por eso van aparte |
| `configuracion.documentos_validados` | `false` hasta la validación legal |
| `documento_credito` | Documentos firmados (bytea ≤ 10 MB; JPG, PNG, WEBP o PDF validados por sus bytes). RLS: el personal ve metadatos; suben Superadmin/Admin. de créditos/Asesor; borran solo admins; los bytes solo por la API. Auditoría sin los bytes |
| `pago.token_recibo` + `nuevo_token_recibo()` | Token del enlace público; los pagos existentes reciben uno al aplicar la migración |
| `credito.contrato_pdf` | Marcado en desuso |

**Aplicada en Railway el 2026-11-25** (registrada en `public._migraciones`; comprobado: `/r/<token>` responde 404 en lugar del error
«column token_recibo does not exist»). Procedimiento usado, útil para las próximas fases: se reemplazó temporalmente el código de la
función `jp-proceso-diario` por un script de migración con el cliente **`bun:SQL`** integrado (la versión con el paquete `pg` no llegó
a ejecutarse en el runtime de funciones), que descarga cada SQL de GitHub fijado a un commit y verifica su SHA-256; se le quitó el cron
para que corriera al desplegar y luego se restauraron su código original y el cron `15 5 * * *`. Los logs de funciones no aparecen
por la API de Railway: verificar el resultado desde la app.

## 4. Verificación
- `npm run lint`, `npm run typecheck`, `npm test` (**213 pruebas; 40 nuevas**: montos en letras —incluye «VEINTIÚN MIL», «UN MILLÓN», céntimos—, fechas, enmascarado, que cada contrato vuelque partes, bien, condiciones, días de gracia, fianza, firmas y anexo; plantilla según el tipo; pagaré sin protesto con aval; cronograma con saldo; recibo público sin el DNI completo; mensaje de WhatsApp; caracteres no imprimibles; y que todos los PDF se generen válidos y con varias páginas) y `npm run build`.
- Migración aplicada dos veces sobre PostgreSQL 16 local con todas las anteriores. RLS: el cobrador ve metadatos pero no los bytes, no puede subir ni borrar.
- Playwright con la base local: contrato vehicular y de celular, pagaré y cronograma en PDF; subida del contrato firmado (y rechazo de un `.txt`); registro de un pago → botón de WhatsApp con el enlace → el recibo abre **sin sesión** por `/r/<token>`; token falso y rutas privadas sin sesión → 404; cobrador sin contrato ni pagaré (404) pero con cronograma y recibo; datos de la empresa guardados y reflejados en el contrato; páginas en móvil (390 px) sin scroll horizontal (se corrigió el de `/admin/pagos/[id]`).

## 5. Pendientes del negocio
- **Validación de los textos por un abogado** (contratos, cláusula de bloqueo, pagaré) y completar en `/admin/tasas` el representante legal y el domicilio.
- Si se emitirán **comprobantes electrónicos SUNAT** (boleta/factura) por la venta: hoy el recibo es una constancia interna.
- `NEXT_PUBLIC_SITE_URL` en Vercel con el dominio definitivo (los enlaces del recibo usan el dominio desde el que se abre el panel).
