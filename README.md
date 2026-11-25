# Inversiones JP

Web pública (y, desde la Fase 1, panel administrativo) de **Inversiones JP**: motos, repuestos y créditos directos.

- Especificación: [`INVERSIONES_JP_MASTER_CONTEXT.md`](INVERSIONES_JP_MASTER_CONTEXT.md)
- Plan y roadmap: [`docs/PLAN_ACTUALIZACION_V2.md`](docs/PLAN_ACTUALIZACION_V2.md)

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

## Estructura (`frontend/src`)

| Carpeta | Contenido |
|---|---|
| `app/` | Rutas (App Router). `api/solicitudes` recibe el formulario de crédito |
| `components/ui/` | Componentes base con Tailwind: `Button`, `Card`, `Badge`, `Field` |
| `components/public/` | Componentes de la web pública: `MotoCard`, `HeroSearch` |
| `lib/` | `config.ts` (valores del sitio), `whatsapp.ts`, `finance.ts` (cuotas/TEA), `format.ts` |
| `schemas/` | Esquemas Zod compartidos cliente/servidor |
| `data/` | Catálogo temporal (pasa a la base de datos en la Fase 1) |

## Variables de entorno

Ver [`frontend/.env.example`](frontend/.env.example). `LEADS_EMAIL` es solo de servidor y es obligatoria para que el formulario de crédito envíe correos.
