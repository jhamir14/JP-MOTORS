# Fase 5 · Pagos y cobranzas

Fecha: 2026-11-25

## 1. Qué incluye

| Ruta | Quién | Qué hace |
|---|---|---|
| `/admin/creditos/[id]/pagar` | Todo el personal | Registra un pago con **vista previa en vivo** del reparto por cuota, atajos (vencido + hoy, próxima cuota, cancelar todo), método, n.º de operación y voucher |
| `/admin/pagos` | Todo el personal | Pagos por rango de fechas, método, usuario o búsqueda (cliente, DNI, código, n.º de operación), con totales efectivo / digital |
| `/admin/pagos/[id]` | Todo el personal (lectura) | Constancia del pago (imprimible), cuotas a las que se aplicó, voucher y **anulación** con motivo (solo admins) |
| `/admin/cobranzas` | Todo el personal | Pestañas **Por cobrar hoy / En mora** (tramos 1–7, 8–15, 16–30, +30) **/ Próximos 3 días / Pagados hoy**, botón **Cobrar** y recordatorio por WhatsApp |
| `/admin/caja` | Todo el personal | **Cierre de caja** del día: el sistema suma los pagos del usuario y él declara el efectivo contado. Los admins ven los cierres del equipo, quién falta cerrar y pueden **reabrir** una caja |
| `/admin/creditos/[id]` | Todo el personal | Saldo con mora, historial de pagos, botón **Registrar pago** y panel **Bloqueo del celular / GPS** (registro manual) |
| `/api/vouchers/[id]` | Con sesión | Descarga privada del voucher (sin caché, auditada en `audit_log` como `DESCARGA`) |

## 2. Reglas de negocio

### Aplicación de pagos
- Las cuotas se pagan **en orden de vencimiento** y, dentro de cada cuota, **mora → interés → capital**. Lo que sobra pasa a la cuota siguiente (**pago adelantado**); un monto menor deja la cuota **parcial**.
- **Sobrepago**: no se permite pagar más que la deuda total del crédito (se muestra el máximo).
- Yape, Plin, transferencia y depósito exigen **n.º de operación**. El voucher (foto o PDF ≤ 8 MB, comprimido en el celular) es opcional.
- La fecha del pago es **hoy en Lima** (el servidor de la base trabaja en UTC: `hoy_lima()`).
- Lógica pura en `src/lib/pagos.ts` (`distribuirPago`, `resumenDeuda`, `validarPago`, `calcularMora`, `resumenCaja`): la usan la vista previa y el servidor, que **vuelve a calcular todo** dentro de una transacción con bloqueo por crédito (dos cobradores no aplican sobre el mismo saldo).

### Mora
`mora de la cuota = penalidad_diaria del crédito × (días de atraso − días de gracia)`, si es positivo.
- Días de gracia: `configuracion.dias_gracia_mora` (3). Días calendario.
- Tope opcional: `configuracion.mora_tope_porcentaje_cuota` (% del valor de la cuota; `null` = sin tope).
- Lo ya cobrado como mora nunca se descuenta; una cuota pagada deja de generar mora.
- Créditos migrados: su penalidad es 0, así que no generan mora nueva.

### Anulación de pagos
Solo Superadmin / Admin. de créditos, con motivo (10–500 caracteres). El pago queda marcado (`anulado_por`, `anulado_at` + `audit_log`),
**sus aplicaciones dejan de contar** y las cuotas vuelven a pendiente/en mora; un crédito cancelado vuelve a vigente.
Un crédito con todos sus pagos anulados **se puede anular** (Fase 4).

### Cierre de caja
- Una caja por usuario y día. Los totales los calcula **la base** (trigger), no el navegador: efectivo y digital de los pagos no anulados del usuario.
- `diferencia = efectivo contado − efectivo según sistema` (lo digital se da por recibido).
- Después de cerrar, el usuario **no puede registrar más pagos ese día** hasta que un admin reabra la caja.

### Bloqueo / GPS (manual)
Celular: Bloquear / Desbloquear / Liberar. Vehículo: Cortar GPS / Restablecer GPS. Lo registran admins y cobradores (`evento_bloqueo`)
y la base actualiza `unidad_celular.estado_bloqueo` o `unidad_vehiculo.estado_gps`. La acción real se hace en la plataforma del proveedor
(PayJoy / Knox / GPS); la integración por API queda para cuando haya convenio.

## 3. Base de datos

Migración `database/migrations/20261130000100_fase5_pagos.sql` (idempotente):

| Objeto | Qué hace |
|---|---|
| `hoy_lima()` | Fecha de hoy en Lima |
| `pago.numero_recibo`, `anulado_por`, `anulado_at` | Correlativo de constancia (los pagos migrados se numeran por fecha) y datos de la anulación |
| `voucher_pago` | Voucher privado (bytea). El personal ve los metadatos; los bytes solo por `/api/vouchers` |
| `recalcular_cuota()` / `recalcular_credito()` | `monto_pagado`, `estado` y `fecha_pago` de la cuota a partir de las aplicaciones de pagos **no anulados**; estado del crédito |
| Triggers de `pago` | Crédito activo, caja abierta, n.º de operación; un pago no se modifica (solo se anula) ni se reactiva; **el monto debe cuadrar con lo aplicado** (verificado al confirmar) |
| Trigger de `aplicacion_pago` | La cuota debe ser del crédito; no se aplica más interés/capital/mora que lo pendiente; no se editan ni borran |
| `actualizar_mora(fecha, crédito)` | Cálculo de mora (la app la llama antes de cada pago) |
| `recalcular_estados()` | Ahora calcula primero la mora y usa la fecha de Lima |
| `proceso_diario()` | Ejecuta lo anterior **una vez por día** (guarda `configuracion.proceso_diario_fecha`) |
| `cierre_caja` | `cantidad_pagos`, `efectivo_contado`, totales por trigger, política para reabrir (admins) y auditoría |
| `evento_bloqueo` | Trigger que valida la acción según el bien y actualiza el estado de la unidad |
| `v_cobranza`, `v_resumen_cartera` | Fecha de Lima y saldo con mora |

### Job diario
1. **El panel** ejecuta `proceso_diario()` al abrirse (no hace nada si ya corrió hoy).
2. **Railway Function con cron** (`database/railway/proceso_diario.ts`), `15 5 * * *` (00:15 en Lima), variable `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.

## 4. Verificación
- `npm run lint`, `npm run typecheck`, `npm test` (**173 pruebas; 19 nuevas** de pagos: exacto, parcial, menor que la mora, adelantado, cuotas ya pagadas, orden, sobrepago, redondeo en céntimos y 300 casos al azar donde lo aplicado siempre suma el monto y nunca se toca capital antes que mora e interés) y `npm run build`.
- Migración aplicada dos veces sobre PostgreSQL 16 local con todas las anteriores.
- SQL directo: mora 14.00 (10 días − 3 de gracia × S/ 2), reparto de S/ 250 en dos cuotas, pago que no cuadra, Yape sin operación, exceso de interés, cobrador sin permiso para anular, monto no editable, bloqueo de celular vs. GPS, caja (totales del servidor aunque el cliente envíe otros, diferencia −10), pago tras cerrar caja, anulación que revierte cuotas, no reactivar, cobrador sin acceso a los bytes del voucher, `proceso_diario()` una vez por día.
- Playwright: cobrador registra un pago Yape con voucher (vista previa = lo guardado), sobrepago bloqueado, voucher descargable con sesión, Pagados hoy, bloqueo del celular, cierre de caja y aviso al intentar cobrar después; admin anula (saldo vuelve a S/ 674.00), ve cierres del equipo y reabre; páginas nuevas en móvil (390 px) sin scroll horizontal.

## 5. Pendientes del negocio
- ¿La mora debe contarse sobre días calendario (actual) o solo hábiles? ¿Hace falta un tope (`mora_tope_porcentaje_cuota`)?
- ¿Se permitirá **condonar mora** (descuento autorizado por un admin)? Hoy no existe.
- Convenios con PayJoy / Knox / proveedor GPS para integrar el bloqueo por API.
