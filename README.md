# Inversiones JP

Web pública y base de datos de **Inversiones JP**, financiera para emprendedores: préstamos en efectivo, crédito vehicular (motos y mototaxis), celulares a crédito y repuestos.

- Especificación: [`INVERSIONES_JP_MASTER_CONTEXT.md`](INVERSIONES_JP_MASTER_CONTEXT.md)
- Plan y roadmap: [`docs/PLAN_ACTUALIZACION_V2.md`](docs/PLAN_ACTUALIZACION_V2.md)
- Base de datos (Fase 1): [`docs/FASE_1_BASE_DE_DATOS.md`](docs/FASE_1_BASE_DE_DATOS.md)

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

CI (GitHub Actions, `.github/workflows/ci.yml`) ejecuta lint, typecheck, tests y build en cada push y PR.

## Estructura

| Carpeta | Contenido |
|---|---|
| `database/migrations/` | Esquema PostgreSQL, RLS, funciones de negocio y datos iniciales (sin datos personales) |
| `database/importar_legado.py` | Migra el backup del sistema anterior (Django/MySQL) al esquema nuevo |
| `frontend/src/app/` | Rutas: `/`, `/prestamos`, `/motos`, `/celulares`, `/repuestos`, `/financiamiento`, `/nosotros`, `api/solicitudes` |
| `frontend/src/components/ui/` | Componentes base: `Button`, `Card`, `Badge`, `Field` |
| `frontend/src/components/public/` | `Simulador`, `MotoCard`, `CelularCard`, `SectionHeading`… |
| `frontend/src/lib/` | `config.ts`, `finance.ts` (cuotas/TEA), `whatsapp.ts`, `server/supabase.ts` (solo servidor) |
| `frontend/src/schemas/` | Esquemas Zod compartidos cliente/servidor |
| `frontend/src/data/` | Catálogo estático (espejo de los datos iniciales; en la Fase 2 se lee de la BD) |

## Variables de entorno

Ver [`frontend/.env.example`](frontend/.env.example). Para que el formulario guarde solicitudes hace falta
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` y/o `LEADS_EMAIL` (todas solo de servidor).
