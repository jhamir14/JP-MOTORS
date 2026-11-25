# Fase 7 · Scoring de clientes

Fecha: 2026-11-25

## 1. Qué incluye

| Ruta | Quién | Qué hace |
|---|---|---|
| `/admin/clientes/[id]` → panel **Score del cliente** | Todo el personal | Puntaje 1–5 con estrellas, **por qué** lo tiene (puntualidad, atraso promedio y máximo, ajustes, topes, créditos, antigüedad) e **historial** de cambios con fecha, usuario y motivo |
| `/admin/clientes` | Todo el personal | Filtro por score (5, 4, 3, 2, 1, sin historial) y orden por nombre, mejor score o menor score |
| `/admin/creditos/nuevo?cliente=…` | Superadmin, Admin. de créditos | Resumen del score con el beneficio que califica; botón **Aplicar beneficio** / **Quitar beneficio**; alerta y confirmación obligatoria para score bajo; bloqueo si tiene cuotas vencidas |
| `/admin/creditos/[id]` | Todo el personal | Muestra el beneficio que se aplicó al registrar el crédito |
| `/admin/tasas` → **Beneficios por score** | Superadmin (edita) | Dos niveles (nombre, score mínimo, % de descuento de tasa, % menos de inicial, cuotas extra), activar/desactivar, exigir un crédito cancelado, bloquear con mora, desde qué score pedir confirmación de riesgo |

Se quitó la insignia «Apto para préstamo en efectivo» y la columna `cliente.apto_prestamo_efectivo`: la empresa no otorga préstamos en efectivo.

## 2. Reglas del score

Se calculan en la base (`recalcular_estados()`: cada noche con el proceso diario y después de cada pago, alta o anulación)
y en TypeScript (`src/lib/scoring.ts`, `calcularScore`) con las **mismas reglas**; si cambias una, cambia la otra.

1. **Base por puntualidad**: % de cuotas pagadas a más tardar `dias_gracia_mora` (3) días después del vencimiento.
   ≥ 95 % → 5 · ≥ 85 % → 4 · ≥ 70 % → 3 · ≥ 50 % → 2 · menos → 1. Sin cuotas pagadas: **sin historial**; si además ya tiene cuotas vencidas, 1.
2. **Ajustes**: −1 si alguna vez se atrasó **más de 30 días** · −1 si hubo **bloqueo de celular o corte de GPS** ·
   +1 si **canceló 2 o más créditos** con atraso promedio dentro de los días de gracia y sin mora hoy. Siempre entre 1 y 5.
3. **Topes**: con cuotas vencidas hoy el máximo es **2**; con más de 30 días de mora hoy, **1**.

Los créditos anulados no cuentan (se informan). Una cuota pagada sin fecha de pago (datos migrados) cuenta como pagada pero no a tiempo,
igual que antes. El estado del cliente (`NUEVO`, `ACTIVO_AL_DIA`, `ACTIVO_EN_MORA`, `EXCELENTE_PAGADOR`) se deriva igual que en la Fase 5.
Los clientes con bloqueo legal no se recalculan.

## 3. Beneficios del siguiente financiamiento

Configuración `configuracion.beneficios_score` (privada), por defecto:

| Nivel | Desde score | Tasa | Inicial | Cuotas |
|---|---|---|---|---|
| Cliente excelente | 5 | −10 % (3 % → 2.7 %) | −50 % | hasta 4 más que el máximo de la tasa |
| Cliente puntual | 4 | −5 % | −25 % | hasta 2 más |

- Solo califica quien ya **canceló al menos un crédito** y **no tiene cuotas vencidas** (ambas opciones se pueden cambiar).
- El asesor pulsa **Aplicar beneficio**: baja la tasa y la inicial de las condiciones que tenga en pantalla y amplía el rango de cuotas.
  Con «cuota fija» el descuento de tasa no se aplica solo (se ajusta la cuota a mano). Cambiar de tipo, plan o tasa quita el beneficio.
- El servidor vuelve a evaluar al cliente al registrar: si ya no califica, rechaza; el beneficio aplicado queda congelado en
  `credito.beneficio_score` (nivel, score y porcentajes).
- **Score ≤ 2** (configurable): alerta «Cliente de riesgo» y casilla obligatoria «Entiendo que el cliente tiene score bajo…».
- **Cuotas vencidas** (contadas en vivo, no esperan al proceso diario): no se puede registrar otro crédito (configurable: solo advertir).

## 4. Base de datos

Migración `database/migrations/20261202000100_fase7_scoring.sql` (idempotente):

| Objeto | Qué hace |
|---|---|
| `cliente_score` | Último cálculo por cliente: puntaje, base, `metricas` (jsonb) y `motivo`. Tabla aparte para no llenar `audit_log` con los cambios diarios de días de atraso |
| `score_historial` | Cada cambio de puntaje o de estado (trigger `cliente_score_historial` sobre `cliente`), con motivo, métricas y usuario. Bloqueo y desbloqueo legal quedan como «Bloqueo legal registrado / levantado». Al aplicar la migración se guarda el punto de partida de cada cliente |
| `recalcular_estados()` | Nuevo paso 3 (métricas → `cliente_score` → `cliente`). Pasos 0–2 sin cambios |
| `configuracion.beneficios_score` | Beneficios y alertas (se edita en `/admin/tasas`) |
| `credito.beneficio_score` | Beneficio aplicado al registrar |
| `cliente.apto_prestamo_efectivo` | **Eliminada** |

RLS: el personal solo lee `cliente_score` y `score_historial`; se escriben desde funciones `security definer`.

## 5. Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (**233 pruebas; 20 nuevas** en `scoring.test.ts`: umbrales, ajustes, topes, que nunca baje de 1,
  métricas desde historiales de ejemplo —puntual, irregular, con GPS, con anulados, sin fecha de pago—, explicación, lectura del jsonb,
  normalización de la configuración, evaluación de beneficio/riesgo/bloqueo y aplicación del beneficio) y `npm run build`.
- PostgreSQL 16 local con todas las migraciones y 300 clientes sintéticos (créditos anulados, cancelados, en mora, bloqueos y cortes de GPS,
  cuotas sin fecha de pago): migración aplicada dos veces; **el puntaje y las 12 métricas de SQL coinciden con TypeScript en los 301 clientes**.
- Playwright con la base local: ficha con explicación e historial; filtro y orden por score; alta con beneficio (tasa 1.2 → 1.08, inicial 200 → 100,
  55 cuotas permitidas solo con el beneficio, quitar restaura) y crédito registrado con el beneficio; cliente en mora bloqueado; score bajo exige
  confirmación; guardado de beneficios; páginas a 390 px sin scroll horizontal (se corrigió un desborde previo de la ficha con tablas anchas).

## 6. Pendientes del negocio

- Validar las **reglas del score y los porcentajes** de los beneficios (hoy son una propuesta razonable y editable en `/admin/tasas`).
- Si el score debe considerar también los **pagos parciales** o los **días hábiles** en lugar de días corridos.
