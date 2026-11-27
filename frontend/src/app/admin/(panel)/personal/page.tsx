import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoSelect, CampoTexto, Check, Encabezado, Panel, fechaCorta } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ROLES_ASIGNABLES } from "@/lib/roles";
import { ETIQUETA_ROL, requerirSesion, type Rol } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { crearPersonal, editarPersonal } from "./actions";

export const metadata = { title: "Personal" };

const opcionesRol = ROLES_ASIGNABLES.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }));
/** Una cuenta antigua de asesor conserva su rol en la lista hasta que el superadmin la reasigne. */
const opcionesPara = (rol: Rol) => ((ROLES_ASIGNABLES as readonly Rol[]).includes(rol) ? opcionesRol : [{ value: rol, label: ETIQUETA_ROL[rol] }, ...opcionesRol]);

export default async function PersonalPage() {
  const sesion = await requerirSesion("SUPERADMIN");
  const personal = await sql()<{ id: string; email: string; nombres: string; apellidos: string; rol: Rol; activo: boolean; ultimo_acceso: Date | null }[]>`
    select u.id, u.email::text as email, p.nombres, p.apellidos, p.rol, (u.activo and p.activo) as activo, u.ultimo_acceso
    from auth.users u join public.perfil_usuario p on p.id = u.id
    order by (u.activo and p.activo) desc, p.rol, p.nombres`;

  return (
    <>
      <Encabezado titulo="Personal">
        Cuentas del panel y sus roles. Cada administrador ve y gestiona solo su área, con sus cobranzas:
        Superadministrador: todo · Admin. de créditos: préstamos de dinero · Admin. de motos: créditos, catálogo e inventario de motos,
        motokar y toritos · Admin. de celulares: créditos, catálogo e inventario de celulares · Cobrador: cobranzas y pagos de todas las áreas.
      </Encabezado>

      <ul className="grid gap-3">
        {personal.map((p) => (
          <li key={p.id}>
            <details className="rounded-2xl border border-line-soft bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-semibold">{p.nombres} {p.apellidos} {p.id === sesion.usuarioId && <span className="text-xs text-muted">(tú)</span>}</div>
                  <div className="text-xs text-muted">{p.email} · último acceso: {p.ultimo_acceso ? fechaCorta(p.ultimo_acceso) : "nunca"}</div>
                </div>
                <div className="flex gap-2">
                  <Badge tone="brand">{ETIQUETA_ROL[p.rol]}</Badge>
                  {!p.activo && <Badge tone="outline">Inactivo</Badge>}
                </div>
              </summary>
              <div className="border-t border-line-soft p-4">
                <AdminForm action={editarPersonal} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                  <input type="hidden" name="id" value={p.id} />
                  <CampoSelect label="Rol" name="rol" id={`rol-${p.id}`} defaultValue={p.rol} opciones={opcionesPara(p.rol)} />
                  <CampoTexto label="Nueva contraseña" name="password" id={`pass-${p.id}`} type="password" autoComplete="new-password" placeholder="Vacío = no cambiar" />
                  <Check label="Activo" name="activo" defaultChecked={p.activo} />
                  <BotonEnviar size="sm">Guardar</BotonEnviar>
                </AdminForm>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <Panel titulo="Nueva cuenta" className="mt-6">
        <AdminForm action={crearPersonal} resetOnSuccess className="grid gap-3 md:grid-cols-3">
          <CampoTexto label="Correo" name="email" type="email" autoComplete="off" required />
          <CampoTexto label="Nombres" name="nombres" required />
          <CampoTexto label="Apellidos" name="apellidos" />
          <CampoTexto label="Teléfono" name="telefono" inputMode="tel" />
          <CampoSelect label="Rol" name="rol" defaultValue="ADMIN_MOTOS" opciones={opcionesRol} />
          <CampoTexto label="Contraseña inicial" name="password" type="password" autoComplete="new-password" hint="Mínimo 10 caracteres, con letras y números." required />
          <div className="md:col-span-3"><BotonEnviar>Crear cuenta</BotonEnviar></div>
        </AdminForm>
      </Panel>
    </>
  );
}
