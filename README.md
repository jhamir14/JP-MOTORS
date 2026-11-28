# Inversiones JP

Sistema web de **Inversiones JP** (Inversiones Multimarca JP · Santa Anita, Lima, Perú): una web pública para vender a crédito
motos, motokar, toritos y celulares, y un panel interno para administrar clientes, créditos, cobranzas y pagos.

- **Web pública:** catálogo, cotizador de cuotas, solicitudes y Libro de Reclamaciones. No cobra en línea: el contrato y el pago se
  hacen con un asesor (tienda o WhatsApp).
- **Panel (`/admin`):** el día a día del negocio. Allí se gestionan las solicitudes que llegan de la web, los clientes y garantes,
  los créditos con su cronograma, los contratos en PDF, la cobranza, los pagos, la caja y los reportes.

## Cómo funciona

```
Cliente ──► Web pública (Next.js en Vercel) ──► PostgreSQL (Railway) ◄── Panel /admin (personal)
              │  catálogo y cotizador              ▲                        │
              │  WhatsApp del asesor del área       │ proceso diario         │ avisos push de cobranza
              └► correo de aviso (Hostinger)        └ Railway Function       └ Vercel Cron 8:00 y 15:00
```

1. El cliente ve el catálogo (`/motos`, `/celulares`, ficha en `/catalogo/<slug>`) con la **cuota desde** de cada producto.
2. En `/cotizar` elige producto, inicial y plazo. El servidor recalcula la cuota, guarda la cotización en `solicitud_credito`,
   avisa por correo a la empresa y le envía una copia al cliente si dejó su correo. También puede escribir directo al WhatsApp del
   área: **motos/motokar/toritos → 902 423 015**, **celulares → 920 694 641**.
3. En el panel, el asesor ve la solicitud, registra al cliente (DNI, recibo, fachada, GPS, garante), crea el crédito y genera el
   contrato, el pagaré y el cronograma en PDF.
4. Los pagos se registran en el panel, que emite un recibo compartible por WhatsApp (`/r/<token>`). Cada noche un proceso calcula
   la mora, los estados de los créditos y el score de cada cliente. A las 8:00 y 15:00 se envían avisos de cobranza al personal.

### Financiamiento

- **Celulares:** cuotas semanales con interés simple mensual según el precio (15 % hasta S/ 999, 10 %, 8 %, 7.5 % y 5 % en gama
  premium), cuota máxima de S/ 200 por semana. La fórmula y los plazos están en `frontend/src/lib/celularesJP.ts`.
- **Motos, motokar y toritos:** planes diarios, semanales o mensuales configurables en el panel (`/admin/tasas` y `/admin/catalogo`).
- **Préstamos de dinero:** solo desde el panel (área del administrador de créditos).

### Roles del panel

Cada administrador de área ve solo su tipo de crédito. La matriz completa está en `frontend/src/lib/permisos.ts` y la base
la refuerza con RLS.

| Rol | Ve |
|---|---|
| Superadministrador | Todo, incluidos Personal y Sistema |
| Administrador de créditos | Solicitudes, préstamos de dinero y reportes |
| Administrador de motos | Solicitudes, créditos de motos/motokar/toritos, su catálogo e inventario y reportes |
| Administrador de celulares | Solicitudes, créditos de celulares, su catálogo e inventario y reportes |
| Cobrador | Clientes, créditos, cobranzas, pagos y caja (todas las áreas) |

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `frontend/src/app/(public)/` | Web: inicio, `/motos`, `/celulares`, `/catalogo/[slug]`, `/cotizar`, `/nosotros`, `/libro-reclamaciones`, `/privacidad`, `/terminos`, `/mis-datos` |
| `frontend/src/app/admin/` | Panel: solicitudes, clientes, créditos, cobranzas, pagos, caja, catálogo, inventario, tasas, reclamos, reportes, personal, sistema |
| `frontend/src/app/api/` | Cotizaciones, solicitudes, reclamos, archivos privados (KYC, vouchers, documentos con sesión y auditoría), PDF, cron de avisos, salud |
| `frontend/src/components/` | Componentes de la web (`public/`), del panel (`admin/`) y base (`ui/`) |
| `frontend/src/lib/` | Lógica de negocio: cuotas y cronogramas, pagos y mora, documentos PDF, permisos, catálogo; `server/` accede a la base |
| `frontend/src/data/` | Catálogo oficial de celulares, fotos por defecto y catálogo de respaldo (si no hay base de datos) |
| `frontend/public/` | Imágenes: `celulares/modelos/` y `motos/modelos/` (productos), `hero/`, `lineas/`, `escenas/`, `marca/` (logo) |
| `database/migrations/` | Esquema PostgreSQL, RLS, funciones de negocio y datos iniciales (sin datos personales) |
| `database/railway/` | Railway Functions: `migrar.ts` (aplica migraciones pendientes) y `proceso_diario.ts` (mora, estados y score) |
| `database/importar_legado.py` | Migración única de los datos del sistema anterior (Django/MySQL) |
| `database/respaldo.sh` | Respaldo lógico de la base (`pg_dump`) |

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
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript y pruebas (Vitest) |
| `npm run build` | Build de producción |
| `npm run admin:crear -- correo "Nombres" "Apellidos" [ROL]` | Crea o restablece una cuenta del panel (requiere `DATABASE_URL`) |

Sin `DATABASE_URL` la web pública funciona con el catálogo de respaldo, pero el panel no. GitHub Actions
(`.github/workflows/ci.yml`) corre lint, typecheck, pruebas y build en cada push y pull request.

## Variables de entorno

Todas están explicadas en [`frontend/.env.example`](frontend/.env.example). Las `NEXT_PUBLIC_*` llegan al navegador (son públicas);
el resto son **solo del servidor** y se configuran en Vercel, nunca en el código:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL en Railway (credencial con acceso total) |
| `PANEL_RUTA_SECRETA` | Ruta privada del login del panel; sin sesión, `/admin` responde 404 |
| `LEADS_EMAIL` | Buzón que recibe el aviso de cada solicitud |
| `CRON_SECRET`, `VAPID_*` | Avisos push de cobranza |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_WHATSAPP_*`, `NEXT_PUBLIC_RUC`, `NEXT_PUBLIC_EMAIL_CONTACTO`, `NEXT_PUBLIC_SITE_URL` | Analítica, WhatsApp por área, datos legales y dominio |

## Base de datos

- PostgreSQL en Railway con respaldos automáticos del volumen (diario, semanal y mensual).
- **Migraciones:** cada archivo de `database/migrations/` se aplica una sola vez y queda registrado en `public._migraciones`.
  Se aplican con la Railway Function `migrar.ts` (generada con `database/railway/construir_funcion.py`) o a mano:
  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f database/migrations/<archivo>.sql
  psql "$DATABASE_URL" -c "insert into public._migraciones (nombre) values ('<archivo sin .sql>') on conflict do nothing"
  ```
  En el panel, **Sistema → Versión de la base** muestra si falta alguna.
- **Respaldo manual** antes de cambios grandes (guárdalo cifrado, fuera del repositorio):
  ```bash
  DATABASE_URL="<DATABASE_PUBLIC_URL de Railway>" ./database/respaldo.sh
  ```

## Seguridad y cumplimiento legal (Perú)

- **Datos personales (Ley 29733):** política en `/privacidad`, casilla de autorización sin marcar en cada formulario y página
  `/mis-datos` para pedir la eliminación por correo o WhatsApp. Los bancos de datos deben estar inscritos ante la ANPD.
- **Cookies:** Google Analytics solo se carga si el visitante acepta el aviso; se puede cambiar en «Configurar cookies» (pie).
- **Consumidor:** Libro de Reclamaciones virtual (`/libro-reclamaciones`) y términos en `/terminos`.
- **Panel:** contraseñas con hash, sesiones en la base, límite de intentos, permisos por rol, archivos privados sin enlaces públicos,
  auditoría de accesos y cambios, cabeceras de seguridad (`next.config.ts`) y registro de errores sin datos personales.
- Monitoreo: `/api/salud` (para UptimeRobot) y **Sistema** en el panel.
