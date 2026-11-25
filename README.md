# Inversiones JP

Web pública, panel y base de datos (PostgreSQL en Railway) de **Inversiones JP**: financiamiento de motos, mototaxis y celulares, y venta de repuestos. No otorga préstamos de dinero en efectivo.

- Especificación: [`INVERSIONES_JP_MASTER_CONTEXT.md`](INVERSIONES_JP_MASTER_CONTEXT.md)
- Plan y roadmap: [`docs/PLAN_ACTUALIZACION_V2.md`](docs/PLAN_ACTUALIZACION_V2.md)
- Base de datos (Fase 1): [`docs/FASE_1_BASE_DE_DATOS.md`](docs/FASE_1_BASE_DE_DATOS.md)
- Catálogo y panel `/admin` (Fase 2): [`docs/FASE_2_CATALOGO_Y_PANEL.md`](docs/FASE_2_CATALOGO_Y_PANEL.md)
- Clientes, garantes y documentos KYC (Fase 3): [`docs/FASE_3_CLIENTES.md`](docs/FASE_3_CLIENTES.md)
- Motor de créditos y web con imágenes (Fase 4): [`docs/FASE_4_CREDITOS.md`](docs/FASE_4_CREDITOS.md)
- Pagos, mora, cobranzas y cierre de caja (Fase 5): [`docs/FASE_5_PAGOS.md`](docs/FASE_5_PAGOS.md)

## Desarrollo local

Requisitos: Node.js 22+.

```bash
cd frontend
npm install
cp .env.example .env.local   # completa los valores
npm run dev                  # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos (TypeScript) |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run build` | Build de producción |
| `npm run admin:crear -- correo "Nombres" "Apellidos" [ROL]` | Crea/restablece una cuenta del panel (requiere `DATABASE_URL`) |

CI (GitHub Actions, `.github/workflows/ci.yml`) ejecuta lint, typecheck, tests y build en cada push y PR.

## Estructura

| Carpeta | Contenido |
|---|---|
| `database/migrations/` | Esquema PostgreSQL, RLS, funciones de negocio y datos iniciales (sin datos personales) |
| `database/importar_legado.py` | Migra el backup del sistema anterior (Django/MySQL) al esquema nuevo |
| `database/railway/` | Railway Functions: `migrar.ts` (aplica migraciones y copia los datos del MySQL en vivo) y `proceso_diario.ts` (job diario de mora y estados) |
| `frontend/src/app/(public)/` | Web: `/`, `/vehiculos` (+ `[slug]`, `torito-bajaj`), `/celulares` (+ `[slug]`), `/repuestos`, `/financiamiento`, `/nosotros`, `/libro-reclamaciones`, `/privacidad`, `/terminos` |
| `frontend/src/app/admin/` | Panel: login, inicio, solicitudes, clientes, créditos (alta, cronograma, anulación, registrar pago), cobranzas (por cobrar hoy, mora por tramos, pagados hoy, WhatsApp), pagos (constancia, anulación), caja (cierre por cobrador), catálogo, inventario, tasas y feriados, reclamos, personal |
| `frontend/src/app/api/` | `solicitudes`, `reclamos`, `archivos/[id]` (fotos del catálogo), `kyc/[id]` y `vouchers/[id]` (documentos y vouchers privados, con sesión y auditoría), `salud` |
| `frontend/src/components/ui/` | Componentes base: `Button`, `Card`, `Badge`, `Field` |
| `frontend/src/components/public/` | `Simulador`, `MotoCard`, `CelularCard`, `SectionHeading`… |
| `frontend/src/components/admin/` | Formularios y piezas del panel |
| `frontend/src/lib/` | `config.ts`, `finance.ts` (cuotas/TEA/cronograma), `clientes.ts` (documentos, duplicados, completitud y permisos KYC), `calendario.ts` (días hábiles y feriados), `creditos.ts` (validación y cronograma definitivo de un crédito), `recordatorios.ts` (mensajes de cobranza), `pagos.ts` (reparto de pagos, mora, caja), `catalogo.ts`, `validaciones.ts`, `server/` (BD, catálogo, auth, contraseñas, límite de intentos) |
| `frontend/src/schemas/` | Esquemas Zod compartidos cliente/servidor |
| `frontend/src/data/` | Respaldo estático del catálogo (solo si no hay base de datos) |

## Variables de entorno

Ver [`frontend/.env.example`](frontend/.env.example). `DATABASE_URL` (PostgreSQL en Railway, solo servidor) es necesaria
para el catálogo administrable, el Libro de Reclamaciones y el panel; sin ella la web pública muestra el catálogo de respaldo.
