# Plan de Actualización del Sistema — Inversiones JP v2.0

> Basado en `INVERSIONES_JP_MASTER_CONTEXT.md` y en una revisión archivo por archivo del código actual (`frontend/`).
> Fecha: 2026-11-25 · Estado: **borrador para aprobación**

---

## 1. Diagnóstico del código actual

### 1.1 Qué hay hoy
| Área | Estado |
|---|---|
| Stack | Next.js 16.2.4 (App Router), React 19.2, TypeScript 5. Sin más dependencias. |
| Rutas | `/`, `/motos`, `/motos/[id]`, `/repuestos`, `/financiamiento`, `/nosotros` |
| Datos | Mocks estáticos: `src/data/mockMotos.ts` (4 motos), `src/data/mockRepuestos.ts` (~17 repuestos) |
| Componentes | Solo `Navbar`, `Footer`, `BottomNav`. Todo lo demás vive dentro de cada `page.tsx`. |
| Estilos | `globals.css` (variables dark mode) + **~340 bloques `style={{...}}` inline** y hovers vía `onMouseOver` |
| Backend / BD / Auth | **No existe**. Leads van a `formsubmit.co` por correo; el resto es WhatsApp `wa.me`. |
| Calidad | Sin tests, sin CI, README vacío, sin `.env`. |

### 1.2 Bugs y deudas confirmados (además de los del §2.3 del documento maestro)
1. **Portada muestra 1 sola moto**: `page.tsx` filtra `[1, 6, 11]` y solo existe el id 1.
2. **Catálogo duplicado e incoherente**: `CB190R 2024` (id 1, S/ 11,966) y `CB190R` (id 4, S/ 11,147) son la misma moto; las 4 motos comparten la misma galería genérica.
3. **Filtros que no coinciden con los datos**: chips `Urbana / Todo Terreno / Deportiva / Trimóvil` vs datos `Deportivas / Trabajo` → "Urbana", "Todo Terreno" y "Trimóvil" siempre dan 0 resultados.
4. **Filtros del hero son decorativos**: sliders, select y buscador de la portada no hacen nada.
5. **Imágenes huérfanas y pesadas**: hay 11 PNG de motos (~500–650 KB c/u, `public/` pesa 26 MB) pero solo se usan 3; casi todo usa `<img>` en vez de `next/image`.
6. **Todo es `"use client"`**: sin renderizado en servidor ni `generateMetadata` por producto → SEO débil en fichas de motos.
7. **`/motos/[id]`** lee el id con `useParams` en cliente y no responde 404 real ante ids inválidos.
8. **Formulario de crédito**: sin validación (DNI de 8 dígitos, celular de 9), el correo receptor queda expuesto en el bundle y el lead **no se guarda en ningún sitio** si el correo falla.
9. **Accesibilidad**: `userScalable: false` / `maximumScale: 1` en `layout.tsx` impide hacer zoom.
10. **Datos hardcodeados repetidos**: número de WhatsApp, ID de GA y tasa 2% están copiados en varios archivos.
11. **Marca desalineada**: metadatos dicen "JP Motors | Distribuidor Exclusivo Honda"; el negocio pasa a ser **Inversiones JP** multivertical.

### 1.3 Observaciones sobre la especificación (corregir antes de codificar)
El esquema Prisma del §7 es una buena base, pero tiene huecos que conviene cerrar **antes** de la primera migración:

| # | Problema | Propuesta |
|---|---|---|
| E1 | Montos como `Float` (errores de redondeo en dinero) | `Decimal @db.Decimal(12,2)` en todos los importes |
| E2 | Nombres de enum distintos al texto (`BLOQUEADO` vs `BLOQUEADO_LEGAL`, `CREDITO_VEHICULO` vs `CREDITO_VEHICULAR`) | Unificar en un único glosario |
| E3 | `tipoCalculoInteres` es `String` | `enum TipoCalculo { FLAT FRANCES }` |
| E4 | `Moto`/`Celular` mezclan **modelo de catálogo** (lo que ve la web) con **unidad física** (motor, VIN, IMEI) | Separar `ProductoCatalogo` (web pública, precio, fotos, specs, `destacado`) de `UnidadMoto`/`UnidadCelular` (inventario serializado) |
| E5 | No hay modelo para las solicitudes de la web | `SolicitudCredito` (lead) con estado `NUEVA → CONTACTADA → EVALUADA → CONVERTIDA/DESCARTADA` |
| E6 | Faltan campos de §6.2 en `Cliente`: sexo, ingreso mensual, giro, dirección laboral; y en garante: dirección y foto DNI | Añadirlos; garante como modelo `Garante` propio (puede respaldar varios créditos) |
| E7 | GPS: corta-corriente como `Boolean`; celular: 3 estados de bloqueo como `Boolean` | Enums `EstadoCorteGps` y `EstadoBloqueoEquipo` + tabla `EventoBloqueo` (quién, cuándo, por qué) |
| E8 | Un `Pago` cuelga de una sola `Cuota`: no soporta pagos que cubren varias cuotas o adelantos | `Pago` ← `AplicacionPago` (pago → n cuotas, separando mora / interés / capital) |
| E9 | `scoreInterno @default(5)`: un cliente nuevo nace con 5 estrellas | Default `null`/3 y cálculo por job |
| E10 | No hay auditoría ni caja | `AuditLog` (cambios sensibles: tasas, anulaciones, bloqueos) y `CierreCaja` diario por cobrador |
| E11 | Sin parámetros globales | `Configuracion` (tasa referencial, tope TEA, penalidad por defecto, feriados) |
| E12 | Sin sucursal | `Sucursal` opcional desde el inicio (barato ahora, caro después) |
| E13 | La tasa es un valor fijo (2% / 1.2%) en el código y no hay forma de definir planes de venta | `TasaServicio` (tasa por defecto por tipo de servicio, editable) y `PlanCredito` por producto (inicial, nº de cuotas, frecuencia, tasa o cuota fija) — ver §2.4 |

### 1.4 Riesgos de negocio y legales a validar con un abogado
No bloquean el inicio del desarrollo, pero sí el **go-live** de créditos y préstamos:
- **Topes de tasa (Ley 31143 / BCRP)**: la tasa referencial de celulares de 1.2% semanal equivale a **≈ 86% TEA**; con "30% flat" en plazos cortos la TEA puede ser mucho mayor. El sistema debe **calcular y mostrar siempre TEA/TCEA** y bloquear operaciones por encima de un tope configurable.
- **Préstamos de efectivo** por una empresa no supervisada: confirmar registro ante SBS/UIF y obligaciones de prevención de lavado.
- **Datos personales (Ley 29733)**: fotos de DNI, recibos y GPS del domicilio son datos sensibles → almacenamiento privado, consentimiento explícito en el formulario, política de privacidad.
- **Bloqueo remoto de celulares y corte GPS**: las cláusulas del §8 deben revisarse para que sean exigibles y no abusivas (Indecopi).
- **Libro de Reclamaciones virtual**: obligatorio; está en la ruta `/nosotros`, falta implementarlo.

---

## 2. Arquitectura propuesta

### 2.1 Decisión principal: **una sola app Next.js** (web pública + admin)
Separadas por *route groups*, compartiendo modelos, lógica financiera y componentes. Es lo más simple de desplegar (Vercel) y mantener para un equipo pequeño. Si el admin crece mucho, se puede extraer después.

| Capa | Recomendación | Motivo |
|---|---|---|
| Base de datos | **PostgreSQL en Supabase** | Postgres gestionado + Storage privado para KYC en un solo proveedor |
| ORM | **Prisma** | Ya definido en el documento maestro |
| Auth admin | **Auth.js (credenciales)** o Supabase Auth, con roles en BD | Roles `SUPERADMIN / ADMIN_CREDITOS / ASESOR_VENTAS / COBRADOR` |
| Estilos | **Tailwind CSS v4** + componentes propios | Elimina los ~340 estilos inline; tokens dark mode actuales se migran a `@theme` |
| Formularios | `react-hook-form` + **Zod** | Mismo esquema valida en cliente y en Server Actions |
| Tablas admin | TanStack Table | Filtros, paginación, exportación |
| PDF | `@react-pdf/renderer` | Contratos, cronogramas y recibos sin navegador headless |
| Jobs diarios | Vercel Cron / Schedules | Recalcular mora, estados y score cada madrugada |
| Tests | **Vitest** (lógica financiera) + Playwright (flujos clave) | El motor de cuotas debe tener cobertura alta |

### 2.2 Estructura de carpetas
```
frontend/                      (renombrable a app/ más adelante)
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                  catálogo real + usuarios demo
├─ src/
│  ├─ app/
│  │  ├─ (public)/             layout con Navbar/Footer/BottomNav
│  │  │  ├─ page.tsx           home multivertical
│  │  │  ├─ vehiculos/  [id]/  torito-bajaj/
│  │  │  ├─ celulares/  [id]/
│  │  │  ├─ repuestos/
│  │  │  ├─ financiamiento/
│  │  │  ├─ nosotros/  libro-reclamaciones/
│  │  ├─ admin/
│  │  │  ├─ login/
│  │  │  └─ (panel)/           layout con sidebar + guard de sesión
│  │  │     ├─ dashboard/ clientes/[id]/ inventario/{motos,celulares}/
│  │  │     ├─ solicitudes/ creditos/[id]/ prestamos-efectivo/
│  │  │     ├─ cobranzas/hoy/ contratos/ reportes/ configuracion/
│  │  └─ api/                  cron, webhooks, descarga de PDFs
│  ├─ components/
│  │  ├─ ui/                   Button, Card, Input, Badge, Modal, Table…
│  │  ├─ public/               ProductCard, Simulador, HeroSelector…
│  │  └─ admin/                Sidebar, KpiCard, SemaforoCobranza…
│  ├─ lib/
│  │  ├─ finance/              cuotas.ts, cronograma.ts, mora.ts, tea.ts (+ tests)
│  │  ├─ whatsapp.ts           plantillas de mensajes y links wa.me
│  │  ├─ db.ts  auth.ts  storage.ts  config.ts
│  ├─ server/                  server actions y consultas por módulo
│  ├─ pdf/                     plantillas de contratos/recibos
│  └─ schemas/                 esquemas Zod compartidos
```

### 2.3 Rutas: compatibilidad
`/motos` y `/motos/[id]` → redirección 301 a `/vehiculos` y `/vehiculos/[slug]` para no perder SEO ni enlaces de campañas ya publicados.

### 2.4 Catálogo, stock y planes de crédito administrables (decisión 2026-11-25)
Todo lo comercial se gestiona **desde el panel administrativo**, sin tocar código:

1. **Productos del catálogo** (`/admin/catalogo`): crear/editar motos, toritos, celulares y repuestos con fotos, specs, precio contado, categoría, `destacado` y `publicado`. Lo que se publica aparece al instante en la web pública.
2. **Ingreso de stock** (`/admin/inventario`): cada unidad nueva se registra contra un producto del catálogo con sus identificadores (motor/VIN/GPS o IMEI/S/N). El stock visible en la web = unidades `EN_STOCK` de ese producto.
3. **Tasas por servicio** (`/admin/configuracion/tasas`): una tasa por defecto distinta para cada servicio (crédito vehicular, crédito celular, préstamo en efectivo, y opcionalmente por categoría: moto lineal, torito, gama de celular), con su tipo de cálculo (FLAT/FRANCÉS) y penalidad por mora. Cambiarla **no altera los créditos ya firmados**: cada crédito guarda una copia de la tasa con la que se pactó.
4. **Planes de crédito por producto** (`PlanCredito`): para cada producto el admin define una o varias combinaciones publicables, por ejemplo:
   - Honda XR150L → Inicial S/ 1,500 · 18 cuotas mensuales de S/ X
   - Redmi Note 13 → Inicial S/ 0 · 26 cuotas semanales de S/ Y
   El admin elige entre ingresar la **tasa** (el sistema calcula la cuota) o fijar directamente el **monto de cuota** (el sistema calcula la tasa/TEA resultante y avisa si supera el tope). La web pública muestra estos planes en la ficha del producto y el simulador parte de ellos.
5. **Al vender**, el asesor elige el plan publicado o uno personalizado; las condiciones quedan congeladas en el `Credito`.

Modelos nuevos: `ProductoCatalogo`, `ImagenProducto`, `TasaServicio`, `PlanCredito`. El ABM de catálogo, stock, tasas y planes se adelanta a la **Fase 2** (ver roadmap).

---

## 3. Roadmap por fases

Cada fase termina desplegada y usable. Estimaciones para 1 desarrollador; son orientativas.

### Fase 0 — Saneamiento y fundaciones (≈ 1 semana)
Objetivo: la web actual queda correcta y lista para crecer, **sin cambiar aún de backend**.
- Corregir bugs 1.2.1–1.2.4 y 1.2.7–1.2.9 (destacados por flag, categorías normalizadas, filtros del hero funcionales, 404 real, zoom, validación del formulario).
- Instalar Tailwind, crear `components/ui` y migrar Navbar/Footer/BottomNav y una página como plantilla.
- `src/lib/config.ts` + `.env.example` (WhatsApp, GA, tasas) — fin de valores repetidos.
- Optimizar imágenes (WebP, `next/image`), eliminar duplicados.
- Rebranding a **Inversiones JP** (metadatos, logo, textos).
- ESLint + `tsc` + build en GitHub Actions.

**Estado (2026-11-25): implementada.** Bugs 1.2.1–1.2.4 y 1.2.7–1.2.10 corregidos; Tailwind v4 con tokens en `@theme` y `components/ui`; Navbar, BottomNav, Footer, portada, catálogo, ficha de moto y formulario migrados (repuestos y nosotros quedan para la Fase 2); imágenes en WebP (26 MB → 3 MB) con `next/image`; formulario validado con Zod en cliente y servidor (`/api/solicitudes`, el correo receptor ya no está en el bundle) y consentimiento Ley 29733; CI con lint, typecheck, Vitest y build. Pendiente: LEADS_EMAIL en Vercel y fotos de galería propias por modelo.

### Fase 1 — Backend base (≈ 1–1.5 semanas)
- Supabase (proyecto dev + prod), Prisma con el **esquema corregido** (§1.3), migración inicial y seed con catálogo real.
- Auth admin con roles, middleware que protege `/admin`, layout del panel.
- `AuditLog` y `Configuracion` desde el día uno.

**Estado (2026-11-25): base de datos en producción en Railway (PostgreSQL), en lugar de Supabase por costo.** Esquema en migraciones SQL (no Prisma) con RLS por rol, auditoría y funciones de negocio; migración del backup del sistema anterior (93 clientes, 155 créditos, 985 cuotas) con `database/importar_legado.py`; web rediseñada como financiera multiservicio (`/prestamos`, `/celulares`). Datos copiados del MySQL en vivo. Pendiente: `DATABASE_URL` en Vercel, backups, auth (Auth.js) y panel `/admin`. Detalle en [`FASE_1_BASE_DE_DATOS.md`](FASE_1_BASE_DE_DATOS.md).

### Fase 2 — Web pública multivertical + catálogo administrable (≈ 2.5–3 semanas)
- Admin: ABM de catálogo con subida de fotos, ingreso de stock básico, tasas por servicio y planes de crédito por producto (§2.4).
- Catálogo desde BD: `/vehiculos`, `/vehiculos/torito-bajaj`, `/celulares`, fichas con `generateMetadata` y renderizado en servidor.
- `lib/finance` con simulador **mensual** (vehículos) y **semanal/quincenal** (celulares), mostrando TEA. Tests unitarios.
- `/financiamiento` guarda `SolicitudCredito` en BD (+ aviso por correo/WhatsApp) y consentimiento de datos.
- Home con selector Motos / Toritos / Celulares; Libro de Reclamaciones.

**Estado (2026-11-25): implementada.** Catálogo, tasas y planes leídos de la BD (con respaldo estático), `/vehiculos` + fichas por slug con SEO y redirecciones 301 desde `/motos`, landing Torito Bajaj, simulador semanal/quincenal con TEA, Libro de Reclamaciones, privacidad y términos. Panel `/admin` con login propio (scrypt + sesiones en BD), roles y RLS por usuario: solicitudes, catálogo con fotos y planes, inventario (VIN/IMEI), tasas y tope de TEA, reclamos y personal. Detalle en [`FASE_2_CATALOGO_Y_PANEL.md`](FASE_2_CATALOGO_Y_PANEL.md).

### Fase 3 — Clientes e inventario (≈ 2 semanas)
- CRUD de clientes con KYC completo, garantes, subida de documentos a Storage **privado** (URLs firmadas), geolocalización.
- Bandeja de **solicitudes** web → convertir en cliente.
- Inventario serializado de motos/toritos (motor, VIN, placa, GPS) y celulares (IMEI 1/2, S/N, plataforma de bloqueo) con validaciones (VIN 17 caracteres, IMEI 15 dígitos + Luhn).

**Estado (2026-11-25): implementada.** `/admin/clientes` con búsqueda y filtro de expedientes incompletos, ficha 360° (pendientes del KYC, GPS con enlace a Google Maps, documentos privados, garantes reutilizables, créditos migrados con cuotas en solo lectura, auditoría), conversión y vinculación de solicitudes web, detección de duplicados (incluye RUC 10 ↔ DNI) y permisos por rol (el cobrador solo consulta y ve la fachada). Documentos en la tabla privada `documento_kyc`, descargables solo por `/api/kyc/<id>` con sesión y registro en `audit_log`. El inventario serializado ya se había adelantado en la Fase 2. Detalle en [`FASE_3_CLIENTES.md`](FASE_3_CLIENTES.md).

### Fase 4 — Motor de créditos (≈ 2 semanas) ⚠️ núcleo del negocio
- Alta de crédito: cliente + unidad + parámetros (precio, inicial, tasa, FLAT/FRANCÉS, frecuencia, nº cuotas, penalidad).
- Generación de cronograma: diario lun–sáb (excluyendo domingos y feriados configurables), semanal, quincenal, mensual; ajuste de redondeo en la última cuota.
- Vista previa antes de confirmar; al confirmar se reserva la unidad (`VENDIDO_CREDITO`) en una transacción.
- Estados del crédito, anulación con motivo y auditoría.
- **Cobertura de tests alta** en todas las combinaciones de cálculo.

**Estado (2026-11-25): implementada y en producción.** Detalle en [`FASE_4_CREDITOS.md`](FASE_4_CREDITOS.md).

### Fase 5 — Pagos y cobranzas (≈ 1.5–2 semanas)
- Registro de pagos (Efectivo, Yape, Plin, transferencia) con voucher; aplicación automática mora → interés → capital, pagos parciales y adelantados.
- **Cobranzas de Hoy**: pestañas Por cobrar / En mora por tramos (1–7, 8–15, 16–30, +30) / Pagados hoy, con botón WhatsApp de mensaje pre-armado.
- Job diario: cálculo de mora, cambio de estados de cuota/crédito/cliente.
- Acciones de bloqueo/corte GPS como **registro manual de eventos** (las APIs de PayJoy/Knox/GPS requieren convenio; se integran después).
- Cierre de caja por cobrador.

**Estado (2026-11-25): implementada.** Registro de pagos con vista previa y voucher privado, aplicación mora → interés → capital por cuota (parciales y adelantos, sin sobrepagos), mora diaria con días de gracia y tope opcional, anulación de pagos que revierte las cuotas, Cobranzas con pestañas y tramos, cierre de caja con totales calculados por la base, registro manual de bloqueo/GPS y job diario (panel + Railway cron). Detalle en [`FASE_5_PAGOS.md`](FASE_5_PAGOS.md).

### Fase 6 — Documentos (≈ 1 semana)
- PDFs: contrato vehicular con reserva de propiedad, contrato de celular con cláusula de bloqueo, mutuo + pagaré, cronograma, recibo de pago.
- Recibo compartible por WhatsApp tras cada pago. Textos legales **validados por abogado**.

**Estado (2026-11-25): implementada.** PDFs generados en el servidor con pdf-lib (sin Chromium): contrato vehicular con reserva de propiedad y GPS, contrato de celular con cláusula de bloqueo, mutuo para préstamos migrados, pagaré sin protesto con aval, cronograma con lo pagado y recibo con monto en letras. Documentos firmados guardados en privado (`documento_credito`), recibo por WhatsApp con enlace no adivinable (`/r/<token>`, DNI enmascarado), datos del representante en `/admin/tasas` y auditoría de cada descarga. Textos marcados como modelo referencial hasta la validación legal. Detalle en [`FASE_6_DOCUMENTOS.md`](FASE_6_DOCUMENTOS.md).

### Fase 7 — Scoring de clientes (≈ 0.5 semana)
- Cálculo de `scoreInterno` según historial y beneficios para clientes puntuales en su siguiente financiamiento.
- ~~Préstamos en efectivo~~: **descartado (decisión 2026-11-25)**. La empresa solo financia productos; los préstamos migrados del sistema anterior se conservan únicamente para su cobranza.

### Fase 8 — Dashboard y reportes (≈ 1 semana)
- KPIs: cartera vigente, colocado del mes, cobrado hoy/mes, % mora por tramo, intereses ganados.
- Reportes con filtros por fecha/sucursal/asesor y exportación a Excel.

### Fase 9 — Endurecimiento y salida a producción (≈ 1 semana)
- Revisión de permisos por rol, rate-limit en formularios públicos, backups automáticos, monitoreo de errores.
- Política de privacidad y términos; validación legal final.
- Capacitación y carga de datos reales.

**Total orientativo: 14–16 semanas.** La web pública mejorada sale en producción al final de la Fase 2; el admin es usable para operar créditos al final de la Fase 5.

---

## 4. Decisiones

### Tomadas (2026-11-25)
- **BD/Auth/Storage**: Supabase.
- **Estilos**: Tailwind CSS v4 (recomendación aceptada).
- **Intereses**: variables por servicio y configurables desde el panel; stock, inicial y cuotas de venta a crédito también se definen desde el panel (§2.4).
- **Solo financiamiento de productos** (motos, mototaxis y celulares): la web **no** ofrece préstamos de dinero en efectivo. Se quitaron `/prestamos` (redirige a `/`), la opción del formulario, la API y las tasas de préstamo (inactivas). Los préstamos migrados siguen en el panel para su cobranza.
- **Tope de TEA**: no se requiere; el campo queda opcional en `/admin/tasas`.
- **RUC**: 10479269217 (en `siteConfig.ruc` y `configuracion.empresa`).
- **Avisos de pago por WhatsApp** con enlaces `wa.me` desde el panel (gratis): botón en la ficha del cliente y en `/admin/cobranzas`; cada envío queda en `recordatorio_pago`.
- **Domingos y feriados no se cobran**: ningún vencimiento cae en esos días (pasa al siguiente día hábil) en todas las frecuencias. Lista editable en `/admin/tasas` (`configuracion.feriados`, cargada 2026–2028); reglas en `src/lib/calendario.ts`.
- **Textos legales** (`/privacidad`, `/terminos`) redactados en el sistema.

### Pendientes
3. **Tipo de cálculo por defecto**: ¿FLAT o FRANCÉS para cada servicio? (el sistema soportará ambos)
5. **Sucursales y usuarios**: ¿cuántas tiendas y cuántos usuarios por rol al inicio?
6. **Bloqueo de equipos y GPS**: ¿ya hay contrato con PayJoy / Knox Guard / proveedor GPS? Define si se integra por API o queda manual.
7. **Dominio y marca**: ¿se mantiene `jpmotorshonda.com` o se migra a un dominio de Inversiones JP?
8. **Datos existentes**: ¿hay clientes/créditos actuales en Excel u otro sistema para migrar?

---

## 5. Siguiente paso: Fase 7 — Scoring de clientes

Fases 0 a 6 terminadas (2026-11-25). **Fase 6** (ver [`FASE_6_DOCUMENTOS.md`](FASE_6_DOCUMENTOS.md)): contratos, pagaré, cronograma y recibo en PDF,
documentos firmados privados, recibo por WhatsApp con enlace público seguro. Migración `20261201000100_fase6_documentos.sql` aplicada en Railway.

**Ya resuelto (no repetir):** todo lo anterior + `lib/documentos.ts` (plantillas puras con tests), `lib/pdf/render.ts`, `lib/server/documentos.ts`
(`datosCredito`, `datosRecibo`, `datosEmpresa`, `auditarDescarga`), `/api/documentos/...`, `/r/[token]`, `documento_credito`, `pago.token_recibo`,
`configuracion.empresa_documentos` y `documentos_validados`.

**Lo que ya existe del score (base para la Fase 7):** `cliente.score_interno` (1–5, `null` = sin historial), `cliente.estado`
(`NUEVO`, `ACTIVO_AL_DIA`, `ACTIVO_EN_MORA`, `EXCELENTE_PAGADOR`, `BLOQUEADO_LEGAL`) y `apto_prestamo_efectivo` (en desuso: ya no hay préstamos),
calculados en `recalcular_estados()` (migración de la Fase 5, se ejecuta en `proceso_diario()`): % de cuotas pagadas a tiempo
(dentro de `dias_gracia_mora`) → 5 (≥95 %), 4 (≥85 %), 3 (≥70 %), 2 (≥50 %), 1; con un crédito en mora el máximo es 2.
El panel muestra las estrellas en `/admin/clientes` y en la ficha.

**Alcance de la Fase 7:**
1. Llevar el cálculo a una función pura y testeada (`lib/scoring.ts`) que explique **por qué** cada cliente tiene su puntaje (puntualidad, días de atraso
   promedio y máximo, cuotas en mora hoy, créditos cancelados, antigüedad, bloqueos/cortes de GPS, anulaciones) y mantener la versión SQL equivalente
   (o guardar un detalle `score_detalle jsonb` + `score_calculado_at`).
2. Historial del score (tabla `score_historial` con fecha, puntaje y motivo) para ver la evolución en la ficha del cliente.
3. **Beneficios para clientes puntuales** en su siguiente financiamiento, configurables en el panel (`configuracion`): p. ej. inicial menor,
   descuento de tasa o más cuotas para score 4–5 / `EXCELENTE_PAGADOR`; y alerta o bloqueo para score 1–2 o mora vigente.
4. Aplicar los beneficios en el **alta de crédito** (`/admin/creditos/nuevo`, `lib/creditos.ts`): sugerirlos y mostrar el score y el historial del cliente
   antes de confirmar; las condiciones finales quedan congeladas como hoy.
5. Filtro y orden por score en `/admin/clientes`; tests con historiales de ejemplo.
6. Eliminar o renombrar `apto_prestamo_efectivo` (la empresa no otorga préstamos) si ya no se usa.

**Pendientes del negocio:** reglas exactas del score y de los beneficios (¿cuánto descuento o inicial?, ¿desde qué puntaje?); validación legal de los
textos de la Fase 6; representante legal y domicilio en `/admin/tasas`; si la mora debe contar solo días hábiles o tener tope; si se permite condonar mora;
fotos reales de celulares y del Torito Bajaj.
