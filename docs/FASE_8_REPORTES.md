# Fase 8 · Dashboard y reportes

Fecha: 2026-11-26

## 1. Qué incluye

| Ruta | Quién | Qué hace |
|---|---|---|
| `/admin` (inicio) → **Indicadores** | Superadmin, Admin. de créditos | Cartera vigente, cartera en mora (% de la cartera y de los créditos), cobrado hoy y en el mes, colocado en el mes, intereses ganados del mes (interés + mora), intereses cobrados vs. pactados, capital por cobrar, **mora por tramo** y **clientes por score** con barras |
| `/admin/reportes` | Superadmin, Admin. de créditos | Cuatro reportes con filtros por **rango de fechas, tipo de crédito, asesor y sucursal**: colocaciones, cobranzas, mora por tramo (foto del día) y créditos cancelados. Totales, agrupaciones y detalle (300 filas en pantalla) |
| `/api/reportes/[tipo]?formato=xlsx\|csv` | Superadmin, Admin. de créditos | Exportación a **Excel (.xlsx)** o CSV con todas las filas (máx. 20 000). Cada descarga queda en `audit_log` |

Los demás roles siguen viendo el inicio operativo (solicitudes, cuotas de hoy, expedientes, stock, reclamos).

## 2. Definiciones

| Indicador | Fórmula |
|---|---|
| Cartera vigente | Σ (cuota + mora − pagado) de las cuotas no pagadas de créditos `VIGENTE`/`EN_MORA` |
| Cartera en mora | La parte de la cartera vigente con vencimiento anterior a hoy (Lima) |
| % de mora | cartera en mora ÷ cartera vigente (1 decimal; 0 si no hay cartera) |
| Cobrado hoy / mes | Σ pagos **no anulados** por `fecha_pago` |
| Intereses ganados | Σ interés + mora de las aplicaciones de pagos no anulados del mes (el capital es recuperación) |
| Intereses cobrados vs. pactados | interés cobrado ÷ `total_intereses` de los créditos activos |
| Colocado | Σ `monto_financiado` de créditos no anulados por `fecha_desembolso` |
| Tramo de mora | Por la **cuota vencida más antigua** del crédito: 1–7, 8–15, 16–30, +30 días |
| Asesor | `credito.creado_por`; en cobranzas también se muestra quién registró el pago |

## 3. Base de datos

Migración `database/migrations/20261203000100_fase8_reportes.sql` (idempotente): funciones `rep_colocaciones`, `rep_cobranzas`,
`rep_mora`, `rep_cancelados` y `rep_kpis` (`security invoker`, sin acceso para `anon`) e índices por fecha de desembolso, cancelación y asesor.
Las funciones devuelven filas; los totales y porcentajes se calculan en `src/lib/reportes.ts` (puro, con pruebas).
Si la migración aún no está aplicada, el panel muestra un aviso en lugar de fallar.

## 4. Exportación

`src/lib/exportar.ts` genera el .xlsx sin dependencias (SpreadsheetML en un ZIP sin compresión, CRC-32 propio): encabezado con
el rango y quién lo generó, fila de títulos congelada con autofiltro, montos como números con formato `#,##0.00`.
El CSV va en UTF-8 con BOM. Ambos **neutralizan fórmulas** (`=`, `+`, `-`, `@` al inicio) para evitar inyección en Excel.
Límite: 30 exportaciones por usuario cada 10 minutos.

## 5. Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (**270 pruebas; 37 nuevas** en `reportes`, `exportar`, `errores` y `permisos`) y `npm run build`.
- PostgreSQL 16 local con todas las migraciones (dos veces) y 80 clientes / 106 créditos sintéticos: los KPIs de `rep_kpis()` coinciden
  con la suma de las filas de `rep_cobranzas`, `rep_colocaciones` y `rep_mora` y con `v_cobranza`.
- Playwright: inicio con indicadores, los 4 reportes, filtro por asesor, descarga .xlsx (validado con `zipfile` + XML) y CSV, auditoría
  en `/admin/sistema`; cobrador sin acceso (menú, página y API → 404); 390 px sin scroll horizontal.

## 6. Pendientes del negocio
- Confirmar con gerencia qué KPIs y reportes ver primero y si la mora debe medirse por cuota o por crédito (hoy: por crédito).
- Metas mensuales (colocación y cobranza) para mostrar avance contra objetivo.
