import type { ReactNode } from "react";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { AvisosMenu } from "@/components/admin/AvisosPush";
import { CampoPassword } from "@/components/admin/CampoPassword";
import { CampoTexto } from "@/components/admin/ui";
import { ETIQUETA_AREA, areaDe } from "@/lib/areas";
import { ETIQUETA_ROL, hashSesionActual, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { clavePublicaPush } from "@/lib/server/push";
import { cambiarCorreo, cambiarPassword, guardarPerfil, salirDeOtrosDispositivos } from "./actions";

export const metadata = { title: "Mi cuenta" };

interface Cuenta {
  telefono: string | null;
  ultimo_acceso: Date | null;
  creada: Date;
}
interface SesionAbierta {
  token_hash: string;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
  expira: Date;
}

/** «Chrome en Android», «Safari en iPhone»… a partir del user-agent (solo orientativo). */
function dispositivo(ua: string | null): { nombre: string; movil: boolean } {
  if (!ua) return { nombre: "Dispositivo desconocido", movil: false };
  const so = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "otro sistema";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return { nombre: `${nav} en ${so}`, movil: /iPhone|Android|iPad|Mobile/.test(ua) };
}

const fechaHora = (d: Date) =>
  new Date(d).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fechaLarga = (d: Date) => new Date(d).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });

/**
 * Mi cuenta: datos personales, correo de acceso, contraseña, dispositivos conectados y avisos.
 * Cada persona del personal solo ve y edita lo suyo (el rol lo asigna el superadmin en «Personal»).
 */
export default async function CuentaPage() {
  const sesion = await requerirSesion();
  const db = sql();
  const [[cuenta], sesiones, actual, clavePush] = await Promise.all([
    db<Cuenta[]>`
      select p.telefono, u.ultimo_acceso, p.created_at as creada
      from auth.users u join public.perfil_usuario p on p.id = u.id where u.id = ${sesion.usuarioId}`,
    db<SesionAbierta[]>`
      select token_hash, ip, user_agent, created_at, expira from public.sesion_panel
      where usuario_id = ${sesion.usuarioId} and expira > now() order by created_at desc limit 10`,
    hashSesionActual(),
    clavePublicaPush(),
  ]);
  const area = areaDe(sesion.rol);
  const iniciales = `${sesion.nombres.charAt(0)}${sesion.apellidos.charAt(0)}`.toUpperCase();
  const otras = sesiones.filter((s) => s.token_hash !== actual).length;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabecera: identidad de la cuenta */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-brand-ink px-5 py-6 text-white shadow-card md:px-8 md:py-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-electrico/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-oro/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-oro-claro to-oro text-2xl font-extrabold text-brand-ink shadow-lg ring-4 ring-white/10 md:size-20 md:text-3xl">
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Mi cuenta</p>
            <h1 className="mt-1 truncate text-2xl text-white md:text-[2rem]">{sesion.nombres} {sesion.apellidos}</h1>
            <p className="mt-1 truncate text-sm text-white/65">{sesion.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">{ETIQUETA_ROL[sesion.rol]}</span>
            <span className="rounded-full bg-oro/15 px-3 py-1 text-xs font-semibold text-oro-claro ring-1 ring-oro/25">
              {area ? `Área: ${ETIQUETA_AREA[area]}` : "Todas las áreas"}
            </span>
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
          <Dato k="Miembro desde">{cuenta ? fechaLarga(cuenta.creada) : "—"}</Dato>
          <Dato k="Último ingreso">{cuenta?.ultimo_acceso ? fechaHora(cuenta.ultimo_acceso) : "—"}</Dato>
          <Dato k="Sesiones abiertas" className="col-span-2 sm:col-span-1">{sesiones.length || 1}</Dato>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Bloque icono="perfil" titulo="Datos personales" texto="Así te ve el resto del equipo en créditos, pagos y recibos.">
          <AdminForm action={guardarPerfil} className="grid gap-4 sm:grid-cols-2">
            <CampoTexto label="Nombres" name="nombres" defaultValue={sesion.nombres} autoComplete="given-name" required />
            <CampoTexto label="Apellidos" name="apellidos" defaultValue={sesion.apellidos} autoComplete="family-name" />
            <CampoTexto label="Celular" name="telefono" defaultValue={cuenta?.telefono ?? ""} inputMode="tel" autoComplete="tel" placeholder="987 654 321" className="sm:col-span-2" />
            <div className="sm:col-span-2"><BotonEnviar size="sm">Guardar cambios</BotonEnviar></div>
          </AdminForm>
        </Bloque>

        <Bloque icono="llave" titulo="Contraseña" texto="Al cambiarla, se cierra tu sesión en los demás dispositivos.">
          <AdminForm action={cambiarPassword} resetOnSuccess className="grid gap-4">
            <CampoPassword label="Contraseña actual" name="passwordActual" autoComplete="current-password" required />
            <CampoPassword label="Nueva contraseña" name="passwordNueva" autoComplete="new-password" medidor hint="Mínimo 10 caracteres, con letras y números." required />
            <CampoPassword label="Repite la nueva contraseña" name="passwordRepetida" autoComplete="new-password" required />
            <div><BotonEnviar size="sm" pendiente="Actualizando…">Cambiar contraseña</BotonEnviar></div>
          </AdminForm>
        </Bloque>

        <Bloque icono="correo" titulo="Correo de acceso" texto="Con este correo entras al panel. Para cambiarlo, confirma tu contraseña.">
          <AdminForm action={cambiarCorreo} className="grid gap-4">
            <CampoTexto label="Correo" name="email" type="email" defaultValue={sesion.email} autoComplete="email" required />
            <CampoPassword label="Contraseña actual" name="passwordActual" autoComplete="current-password" required />
            <div><BotonEnviar size="sm">Actualizar correo</BotonEnviar></div>
          </AdminForm>
        </Bloque>

        <Bloque icono="dispositivo" titulo="Dispositivos conectados" texto="Dónde está abierta tu cuenta ahora mismo.">
          <ul className="-my-1 divide-y divide-line-soft">
            {sesiones.map((s) => {
              const d = dispositivo(s.user_agent);
              const esta = s.token_hash === actual;
              return (
                <li key={s.token_hash} className="flex items-center gap-3 py-3">
                  <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${esta ? "bg-accent-soft text-accent" : "bg-surface-2 text-brand"}`}>
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      {d.movil ? <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> : <><rect x="2.5" y="4" width="19" height="12.5" rx="2" /><path d="M8 20.5h8M12 16.5v4" /></>}
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{d.nombre}</span>
                      {esta && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Este dispositivo</span>}
                    </div>
                    <div className="truncate text-xs text-muted">Desde {fechaHora(s.created_at)}{s.ip ? ` · IP ${s.ip}` : ""}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          {otras > 0 && (
            <AdminForm action={salirDeOtrosDispositivos} className="mt-4 grid gap-3">
              <BotonEnviar size="sm" variant="outline" pendiente="Cerrando…">
                {otras === 1 ? "Cerrar sesión en el otro dispositivo" : `Cerrar sesión en los otros ${otras} dispositivos`}
              </BotonEnviar>
            </AdminForm>
          )}
        </Bloque>

        <Bloque icono="campana" titulo="Avisos" texto="Notificaciones de cobranza en este celular o computadora." className="lg:col-span-2">
          <div className="max-w-xl"><AvisosMenu clave={clavePush} /></div>
        </Bloque>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        ¿Necesitas cambiar tu rol o tu área? Pídeselo al superadministrador: se asigna en «Personal».
      </p>
    </div>
  );
}

function Dato({ k, children, className }: { k: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">{k}</dt>
      <dd className="mt-0.5 font-semibold text-white/90">{children}</dd>
    </div>
  );
}

const ICONOS: Record<string, ReactNode> = {
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  llave: <><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.7-8.7M16 6l3 3M14 8l2 2" /></>,
  correo: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></>,
  dispositivo: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  campana: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
};

function Bloque({ icono, titulo, texto, children, className }: { icono: string; titulo: string; texto: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:p-6 ${className ?? ""}`}>
      <header className="mb-5 flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONOS[icono]}</svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold">{titulo}</h2>
          <p className="text-xs text-muted">{texto}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
