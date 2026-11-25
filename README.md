# Inversiones JP

Web pública y base de datos (PostgreSQL en Railway) de **Inversiones JP**, financiera para emprendedores: préstamos en efectivo, crédito vehicular (motos y mototaxis), celulares a crédito y repuestos.

- Especificación: [`INVERSIONES_JP_MASTER_CONTEXT.md`](INVERSIONES_JP_MASTER_CONTEXT.md)
- Plan y roadmap: [`docs/PLAN_ACTUALIZACION_V2.md`](docs/PLAN_ACTUALIZACION_V2.md)
- Base de datos (Fase 1): [`docs/FASE_1_BASE_DE_DATOS.md`](docs/FASE_1_BASE_DE_DATOS.md)
- Catálogo y panel `/admin` (Fase 2): [`docs/FASE_2_CATALOGO_Y_PANEL.md`](docs/FASE_2_CATALOGO_Y_PANEL.md)
- Clientes, garantes y documentos KYC (Fase 3): [`docs/FASE_3_CLIENTES.md`](docs/FASE_3_CLIENTES.md)

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
| `database/railway/` | Railway Function que aplica migraciones y copia los datos desde el MySQL en vivo |
| `frontend/src/app/(public)/` | Web: `/`, `/prestamos`, `/vehiculos` (+ `[slug]`, `torito-bajaj`), `/celulares` (+ `[slug]`), `/repuestos`, `/financiamiento`, `/nosotros`, `/libro-reclamaciones`, `/privacidad`, `/terminos` |
| `frontend/src/app/admin/` | Panel: login, inicio, solicitudes, clientes, catálogo, inventario, tasas, reclamos, personal |
| `frontend/src/app/api/` | `solicitudes`, `reclamos`, `archivos/[id]` (fotos del catálogo), `kyc/[id]` (documentos privados, con sesión y auditoría), `salud` |
| `frontend/src/components/ui/` | Componentes base: `Button`, `Card`, `Badge`, `Field` |
| `frontend/src/components/public/` | `Simulador`, `MotoCard`, `CelularCard`, `SectionHeading`… |
| `frontend/src/components/admin/` | Formularios y piezas del panel |
| `frontend/src/lib/` | `config.ts`, `finance.ts` (cuotas/TEA/cronograma), `clientes.ts` (documentos, duplicados, completitud y permisos KYC), `catalogo.ts`, `validaciones.ts`, `server/` (BD, catálogo, auth, contraseñas, límite de intentos) |
| `frontend/src/schemas/` | Esquemas Zod compartidos cliente/servidor |
| `frontend/src/data/` | Respaldo estático del catálogo (solo si no hay base de datos) |

## Variables de entorno

Ver [`frontend/.env.example`](frontend/.env.example). `DATABASE_URL` (PostgreSQL en Railway, solo servidor) es necesaria
para el catálogo administrable, el Libro de Reclamaciones y el panel; sin ella la web pública muestra el catálogo de respaldo.
