# Fase 4 · Motor de créditos (+ rediseño de la web con imágenes)

Fecha: 2026-11-25

## 1. Qué incluye

| Ruta | Quién | Qué hace |
|---|---|---|
| `/admin/creditos` | Todo el personal (lectura) | Listado con KPIs (activos, en mora, cartera por cobrar, colocado del mes), filtros por estado y tipo, búsqueda por código, cliente o DNI |
| `/admin/creditos/nuevo` | Superadmin, Admin. créditos | Busca al cliente; con `?cliente=<id>` abre el alta (también desde **«+ Nuevo crédito»** en la ficha del cliente) |
| `/admin/creditos/[id]` | Todo el personal (lectura) | Condiciones pactadas, partes y bien, cronograma completo, **imprimir/guardar PDF** y **anulación** con motivo |

### Alta de crédito (vehicular o celular)
1. **Producto**: unidad del inventario en `EN_STOCK` o `RESERVADO` (precio de lista editable), plan del catálogo opcional (rellena inicial, cuotas, frecuencia, cálculo y tasa o cuota fija) y garante vinculado al cliente (**obligatorio en vehicular**).
2. **Condiciones**: tasa vigente de `tasa_servicio` (aplica su rango de cuotas) o personalizadas: precio, inicial, frecuencia, n.º de cuotas, FRANCÉS/FLAT, **tasa o cuota fija** (el sistema deduce la tasa), penalidad diaria, fecha de entrega y primer vencimiento (sugerido un periodo después, en día hábil).
3. **Vista previa en vivo**: financiado, cuota, intereses, total, TEA y cronograma con fechas (sin domingos ni feriados de `configuracion.feriados`).
4. **Confirmación** (casilla «revisé el cronograma con el cliente»): el servidor **vuelve a calcular todo** y en una transacción con la identidad del usuario (RLS + auditoría) inserta `credito` + `cuota`, la unidad pasa a `VENDIDO_CREDITO` y se recalculan estados del cliente.

### Reglas
- Lógica pura en `src/lib/creditos.ts` (`validarCredito`, `planCredito`, `primerVencimientoSugerido`): la usan el navegador (vista previa) y el servidor.
- La base también las garantiza (trigger `credito_validar`): cliente con bloqueo legal, unidad no disponible, préstamo en efectivo y reactivar un anulado → rechazados.
- Máximo de cuotas por frecuencia: diario 600, semanal 156, quincenal 72, mensual 48. Primer vencimiento hasta 3 meses después de la entrega.
- Tope de TEA: si `configuracion.tope_tea_porcentaje` tiene valor, no se registra un crédito por encima.

### Anulación
Solo Superadmin / Admin. de créditos, **sin pagos** aplicados, motivo de 10–500 caracteres. Guarda `motivo_anulacion`, `anulado_por`, `anulado_at`
(+ `audit_log`), la unidad vuelve a `EN_STOCK` y **se puede volver a financiar** (la unicidad de unidad aplica solo a créditos no anulados).

## 2. Decisiones de negocio configurables (`configuracion`)

| Clave | Por defecto | Efecto |
|---|---|---|
| `credito_exige_expediente_completo` | `false` | `false`: el alta muestra una **advertencia** con lo que falta. `true`: no permite registrar el crédito |
| `credito_vehicular_exige_garante` | `true` | Garante obligatorio en crédito vehicular |
| `tope_tea_porcentaje` | `null` | Tope legal de TEA (lo fija el área legal) |

El tipo de cálculo por defecto sale de cada tasa en `/admin/tasas` (hoy FRANCÉS en vehicular y celular).

## 3. Base de datos

Migración `database/migrations/20261129000100_fase4_creditos.sql` (idempotente):
- Índices únicos parciales `credito_unidad_vehiculo_activa` / `credito_unidad_celular_activa` (reemplazan las restricciones únicas).
- `credito.anulado_por`, `credito.anulado_at` y trigger `credito_validar`.
- Claves de configuración de la tabla anterior.

**Pendiente de aplicar en Railway** (no se aplicó desde esta sesión):
```bash
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f database/migrations/20261129000100_fase4_creditos.sql
```

## 4. Rediseño de la web pública con imágenes

- **Portada**: hero con foto de fondo y fotos de clientes, franja de 4 fotos (motos, mototaxis, celulares, repuestos), tarjetas de servicios con foto,
  «Cómo funciona» con foto, «Paga como trabajas» con foto, galería «En la calle», bloque de puntualidad con foto y CTA final con foto.
- **Páginas internas** con cabecera fotográfica (`components/public/PageHero.tsx`): vehículos, celulares, repuestos, financiamiento, nosotros y Torito Bajaj (tarjetas de versiones con foto).
- Las fotos de motos del catálogo ahora llenan la tarjeta (`object-cover`).
- Nuevas ilustraciones de celulares (`public/celulares/`) generadas para la web (sin marcas): reemplazar por fotos reales cuando estén.
- «Nosotros» ya no menciona préstamos en efectivo.

## 5. Verificación
- `npm run lint`, `npm run typecheck`, `npm test` (**154 pruebas; 81 nuevas** del motor: todas las combinaciones frecuencia × FLAT/FRANCÉS × tasa/cuota fija × 1/2/7/24 cuotas cumplen las restricciones de la base, fechas hábiles, feriados, tope TEA, validaciones) y `npm run build`.
- Migración aplicada dos veces sobre PostgreSQL 16 local con todas las anteriores.
- Playwright (13 comprobaciones): advertencia de expediente, precio de lista, vista previa (708.25), confirmación obligatoria, alta, anulación y unidad a stock, volver a financiar la unidad, crédito de celular sin garante, KPIs, formulario móvil sin scroll horizontal, cobrador sin acceso al alta ni a anular.
- SQL directo: unidad vendida, préstamo en efectivo, reactivar anulado y cliente bloqueado → rechazados por el trigger.
- Capturas de todas las páginas públicas en escritorio (1280) y móvil (390) sin scroll horizontal ni imágenes rotas.
