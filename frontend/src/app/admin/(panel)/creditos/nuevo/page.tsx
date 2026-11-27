import Link from "next/link";
import { Encabezado } from "@/components/admin/ui";
import { FormCredito } from "@/components/admin/FormCredito";
import { FormPrestamo } from "@/components/admin/FormPrestamo";
import { ScoreCliente } from "@/components/admin/ScoreCliente";
import { Badge } from "@/components/ui";
import { areaDe, tiposDe } from "@/lib/areas";
import { ROLES_CREDITOS } from "@/lib/creditos";
import { ETIQUETA_ESTADO_CLIENTE, faltantesCliente, type DatosKyc, type EstadoCliente } from "@/lib/clientes";
import { ETIQUETA_ROL, requerirSesion } from "@/lib/server/auth";
import { COLUMNAS_KYC } from "@/lib/server/clientes";
import { hoyLima } from "@/lib/server/cobranza";
import { configCreditos, opcionesAltaCredito } from "@/lib/server/creditos";
import { sql } from "@/lib/server/db";
import { evaluarCliente, describirBeneficio } from "@/lib/scoring";
import { configBeneficios, perfilParaCredito, perfilScore } from "@/lib/server/scoring";
import { crearCredito, crearPrestamo } from "../actions";
import { BuscadorCliente } from "../BuscadorCliente";
import { PestanasTipo, tipoDeVista, vistaDeParam, vistaDeTipo, type Vista } from "../PestanasTipo";

export const metadata = { title: "Nuevo crédito" };

type ClienteAlta = DatosKyc & { id: string; nombres: string; apellidos: string; estado: EstadoCliente; registrado_por: string | null; asesor: string | null };

/**
 * Alta de crédito o préstamo en UNA sola pantalla: el cliente se busca con sugerencias dentro del mismo
 * formulario (se puede elegir antes o después de escribir el monto) y se elige el responsable (administrador del área).
 * Cada administrador de área solo registra lo suyo: préstamos, motos o celulares (src/lib/areas.ts).
 */
export default async function NuevoCreditoPage({ searchParams }: { searchParams: Promise<{ cliente?: string; tipo?: string }> }) {
  const sesion = await requerirSesion(...ROLES_CREDITOS);
  const sp = await searchParams;
  const area = areaDe(sesion.rol);
  const vista: Vista = area ? vistaDeTipo(area) : (vistaDeParam(sp.tipo) ?? "motos");
  const prestamo = vista === "prestamo";
  const tipoProducto = tipoDeVista(vista);
  const db = sql();
  const clienteId = /^[0-9a-f-]{36}$/.test(sp.cliente ?? "") ? sp.cliente! : null;

  const [config, opciones, hoy, asesores, clienteFila] = await Promise.all([
    configCreditos(db),
    opcionesAltaCredito(db),
    hoyLima(db),
    db<{ id: string; nombre: string; rol: keyof typeof ETIQUETA_ROL }[]>`
      select p.id, p.nombres || ' ' || p.apellidos as nombre, p.rol
      from public.perfil_usuario p join auth.users u on u.id = p.id and u.activo
      where p.activo and p.rol::text = any(${area ? ["SUPERADMIN", sesion.rol] : prestamo ? ["SUPERADMIN", "ADMIN_CREDITOS"] : ["SUPERADMIN", vista === "motos" ? "ADMIN_MOTOS" : "ADMIN_CELULARES", "ASESOR_VENTAS"]})
      order by (p.rol = 'SUPERADMIN'), p.rol, p.nombres, p.apellidos`,
    clienteId
      ? db<ClienteAlta[]>`
          select c.id, c.nombres, c.apellidos, c.estado, c.registrado_por,
                 nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as asesor,
                 ${db(COLUMNAS_KYC.map((k) => `c.${k}`) as unknown as string[])}
          from public.cliente c left join public.perfil_usuario p on p.id = c.registrado_por
          where c.id = ${clienteId}`
      : Promise.resolve([] as ClienteAlta[]),
  ]);
  const cliente = clienteFila[0] ?? null;

  const extra = cliente
    ? await Promise.all([
        db<{ id: string; nombre: string }[]>`
          select g.id, g.nombres || ' ' || g.apellidos || ' · ' || g.numero_documento as nombre
          from public.cliente_garante cg join public.garante g on g.id = cg.garante_id
          where cg.cliente_id = ${cliente.id} order by cg.created_at`,
        db<{ tipo: string }[]>`select distinct tipo from public.documento_kyc where cliente_id = ${cliente.id}`,
        db<{ n: number }[]>`select count(*)::int as n from public.credito where cliente_id = ${cliente.id} and estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')`,
        perfilScore(db, cliente.id, 5),
        perfilParaCredito(db, cliente.id),
        configBeneficios(db),
      ])
    : null;
  const [garantes, docs, activos, score, perfil, beneficios] = extra ?? [[], [], [{ n: 0 }], null, null, null];
  const evaluacion = perfil && beneficios ? evaluarCliente(perfil, beneficios) : null;
  const faltan = cliente ? faltantesCliente(cliente, docs.map((d) => d.tipo)) : [];
  const bloqueaExpediente = config.exigeExpedienteCompleto && faltan.length > 0;
  const bloqueo = !cliente
    ? null
    : cliente.estado === "BLOQUEADO_LEGAL"
      ? "El cliente tiene bloqueo legal: no puede recibir créditos ni préstamos."
      : evaluacion?.bloqueo ?? (bloqueaExpediente ? `Expediente incompleto. Falta: ${faltan.join(", ")}.` : null);

  // Responsable por defecto: el administrador del área que lo registra; si no, quien registró al cliente.
  const enLista = (id: string | null | undefined) => !!id && asesores.some((a) => a.id === id);
  const asesorInicial = (area && enLista(sesion.usuarioId) ? sesion.usuarioId : null)
    ?? (enLista(cliente?.registrado_por) ? cliente!.registrado_por! : null)
    ?? (enLista(sesion.usuarioId) ? sesion.usuarioId : asesores[0]?.id ?? "");
  const listaAsesores = asesores.map((a) => ({ id: a.id, nombre: `${a.nombre} (${ETIQUETA_ROL[a.rol]})` }));

  const comunes = {
    clienteId: cliente?.id ?? null,
    garantes,
    feriados: config.feriados,
    hoy,
    topeTea: config.topeTea,
    alertaRiesgo: evaluacion?.alertaRiesgo ?? null,
    asesores: listaAsesores,
    asesorInicial,
    bloqueo,
  };

  const panelCliente = (
    <section aria-labelledby="titulo-cliente" className="mb-5 grid gap-3 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-cliente" className="text-lg">👤 Cliente</h2>
        <Link href="/admin/clientes/nuevo" className="text-sm font-semibold text-brand">+ Registrar cliente nuevo</Link>
      </div>
      <BuscadorCliente
        seleccionado={cliente ? { id: cliente.id, nombre: `${cliente.nombres} ${cliente.apellidos}`, documento: cliente.numero_documento, asesor: cliente.asesor } : null}
      />
      {cliente && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>{ETIQUETA_ESTADO_CLIENTE[cliente.estado]}</span>
          {activos[0].n > 0 && <span>· ya tiene {activos[0].n} crédito{activos[0].n > 1 ? "s" : ""} activo{activos[0].n > 1 ? "s" : ""}</span>}
          <span>· Score: {perfil?.puntaje != null ? `${perfil.puntaje} de 5` : "sin historial"}</span>
          {evaluacion?.nivel && <Badge tone="accent">🎁 {evaluacion.nivel.nombre}: {describirBeneficio(evaluacion.nivel)}</Badge>}
          <Link href={`/admin/clientes/${cliente.id}`} className="ml-auto font-semibold text-brand">Ver ficha →</Link>
        </div>
      )}
      {bloqueo && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          <strong>No se puede registrar.</strong> {bloqueo}
        </p>
      )}
      {!bloqueo && evaluacion?.alertaRiesgo && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          <strong>Cliente de riesgo.</strong> {evaluacion.alertaRiesgo}
        </p>
      )}
      {cliente && score && (evaluacion?.alertaRiesgo || evaluacion?.bloqueo) && (
        <details className="rounded-xl border border-line-soft p-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Ver detalle del score</summary>
          <div className="mt-3"><ScoreCliente perfil={score} bloqueado={cliente.estado === "BLOQUEADO_LEGAL"} historial={5} /></div>
        </details>
      )}
    </section>
  );

  return (
    <>
      <Link href={`/admin/creditos?tipo=${vista}`} className="text-sm font-medium text-muted hover:text-brand">
        ← {prestamo ? "Préstamos" : vista === "motos" ? "Créditos de motos" : "Créditos de celulares"}
      </Link>
      <Encabezado titulo={prestamo ? "Nuevo préstamo de dinero" : vista === "motos" ? "Nuevo crédito de moto" : "Nuevo crédito de celular"}>
        Todo en una sola pantalla: busca al cliente, completa {prestamo ? "el monto y las cuotas" : "la unidad, el precio y las cuotas"} y confirma.
      </Encabezado>
      <PestanasTipo activo={vista} base="/admin/creditos/nuevo" cliente={cliente?.id} visibles={tiposDe(sesion.rol)} />
      {panelCliente}
      {prestamo ? (
        <FormPrestamo action={crearPrestamo} tasas={opciones.tasas.filter((t) => t.servicio === "PRESTAMO_EFECTIVO")} {...comunes} />
      ) : (
        <FormCredito
          action={crearCredito}
          key={tipoProducto}
          unidades={opciones.unidades.filter((u) => u.tipo === (tipoProducto === "CREDITO_VEHICULAR" ? "vehiculo" : "celular"))}
          planes={opciones.planes}
          tasas={opciones.tasas.filter((t) => t.servicio !== "PRESTAMO_EFECTIVO")}
          tiposPermitidos={[tipoProducto as "CREDITO_VEHICULAR" | "CREDITO_CELULAR"]}
          vehicularExigeGarante={config.vehicularExigeGarante}
          beneficio={evaluacion?.nivel ?? null}
          puntaje={perfil?.puntaje ?? null}
          {...comunes}
        />
      )}
    </>
  );
}
