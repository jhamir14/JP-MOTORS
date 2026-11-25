import Link from "next/link";
import { Encabezado, Panel, Vacio } from "@/components/admin/ui";
import { FormCredito } from "@/components/admin/FormCredito";
import { ScoreCliente } from "@/components/admin/ScoreCliente";
import { Badge } from "@/components/ui";
import { ROLES_CREDITOS } from "@/lib/creditos";
import { ETIQUETA_ESTADO_CLIENTE, faltantesCliente, type DatosKyc, type EstadoCliente } from "@/lib/clientes";
import { requerirSesion } from "@/lib/server/auth";
import { COLUMNAS_KYC } from "@/lib/server/clientes";
import { hoyLima } from "@/lib/server/cobranza";
import { configCreditos, opcionesAltaCredito } from "@/lib/server/creditos";
import { sql } from "@/lib/server/db";
import { evaluarCliente, describirBeneficio } from "@/lib/scoring";
import { configBeneficios, perfilParaCredito, perfilScore } from "@/lib/server/scoring";
import { crearCredito } from "../actions";

export const metadata = { title: "Nuevo crédito" };

export default async function NuevoCreditoPage({ searchParams }: { searchParams: Promise<{ cliente?: string; q?: string }> }) {
  await requerirSesion(...ROLES_CREDITOS);
  const sp = await searchParams;
  const db = sql();
  const clienteId = /^[0-9a-f-]{36}$/.test(sp.cliente ?? "") ? sp.cliente! : null;

  // Paso 0: elegir al cliente
  if (!clienteId) {
    const q = (sp.q ?? "").trim().slice(0, 60);
    const patron = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const clientes = q
      ? await db<{ id: string; nombres: string; apellidos: string; numero_documento: string; estado: EstadoCliente }[]>`
          select id, nombres, apellidos, numero_documento, estado from public.cliente
          where numero_documento ilike ${patron} or (nombres || ' ' || apellidos) ilike ${patron} or telefono ilike ${patron}
          order by apellidos, nombres limit 20`
      : [];
    return (
      <>
        <Link href="/admin/creditos" className="text-sm font-medium text-muted hover:text-brand">← Créditos</Link>
        <Encabezado titulo="Nuevo crédito">Busca al cliente. Si aún no está registrado, regístralo primero con sus garantes.</Encabezado>
        <Panel>
          <form className="flex flex-col gap-2 sm:flex-row" role="search">
            <input name="q" defaultValue={q} placeholder="DNI, nombre o celular" aria-label="Buscar cliente" className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm" autoFocus />
            <button type="submit" className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Buscar</button>
          </form>
          {q && (
            <ul className="mt-4 divide-y divide-line-soft">
              {clientes.length === 0 && <li className="py-3 text-sm text-muted">Sin resultados. <Link href="/admin/clientes/nuevo" className="font-semibold text-brand">Registrar cliente →</Link></li>}
              {clientes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <span className="font-semibold">{c.nombres} {c.apellidos}</span>
                    <span className="ml-2 text-xs text-muted">{c.numero_documento}</span>
                  </span>
                  {c.estado === "BLOQUEADO_LEGAL" ? (
                    <Badge tone="outline">Bloqueado</Badge>
                  ) : (
                    <Link href={`/admin/creditos/nuevo?cliente=${c.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Elegir</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </>
    );
  }

  const [cliente] = await db<(DatosKyc & { id: string; nombres: string; apellidos: string; estado: EstadoCliente })[]>`
    select id, nombres, apellidos, estado, ${db(COLUMNAS_KYC as unknown as string[])} from public.cliente where id = ${clienteId}`;
  if (!cliente) return <Vacio>El cliente no existe.</Vacio>;

  const [config, opciones, hoy, garantes, docs, activos, score, perfil, beneficios] = await Promise.all([
    configCreditos(db),
    opcionesAltaCredito(db),
    hoyLima(db),
    db<{ id: string; nombre: string }[]>`
      select g.id, g.nombres || ' ' || g.apellidos || ' · ' || g.numero_documento as nombre
      from public.cliente_garante cg join public.garante g on g.id = cg.garante_id
      where cg.cliente_id = ${clienteId} order by cg.created_at`,
    db<{ tipo: string }[]>`select distinct tipo from public.documento_kyc where cliente_id = ${clienteId}`,
    db<{ n: number }[]>`select count(*)::int as n from public.credito where cliente_id = ${clienteId} and estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')`,
    perfilScore(db, clienteId, 5),
    perfilParaCredito(db, clienteId),
    configBeneficios(db),
  ]);
  const evaluacion = evaluarCliente(perfil, beneficios);
  const faltan = faltantesCliente(cliente, docs.map((d) => d.tipo));
  const bloqueado = cliente.estado === "BLOQUEADO_LEGAL";
  const bloqueaExpediente = config.exigeExpedienteCompleto && faltan.length > 0;

  return (
    <>
      <Link href={`/admin/clientes/${clienteId}`} className="text-sm font-medium text-muted hover:text-brand">← Ficha del cliente</Link>
      <Encabezado titulo="Nuevo crédito">
        Para <strong className="text-fg">{cliente.nombres} {cliente.apellidos}</strong> · {ETIQUETA_ESTADO_CLIENTE[cliente.estado]}
        {activos[0].n > 0 && ` · ya tiene ${activos[0].n} crédito${activos[0].n > 1 ? "s" : ""} activo${activos[0].n > 1 ? "s" : ""}`}
      </Encabezado>

      <details className="mb-5 rounded-2xl border border-line-soft bg-surface shadow-card" open={evaluacion.alertaRiesgo != null || evaluacion.bloqueo != null}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-4 [&::-webkit-details-marker]:hidden">
          <h2 className="text-base">Score del cliente: {perfil.puntaje != null ? `${perfil.puntaje} de 5` : "sin historial"}</h2>
          {evaluacion.nivel ? (
            <Badge tone="accent">🎁 {evaluacion.nivel.nombre}: {describirBeneficio(evaluacion.nivel)}</Badge>
          ) : (
            evaluacion.motivoSinBeneficio && <span className="text-xs text-muted">Sin beneficio: {evaluacion.motivoSinBeneficio.toLowerCase()}</span>
          )}
          <span className="ml-auto text-xs font-semibold text-brand">Ver detalle</span>
        </summary>
        <div className="border-t border-line-soft p-4">
          <ScoreCliente perfil={score} bloqueado={bloqueado} historial={5} />
        </div>
      </details>

      {bloqueado ? (
        <Vacio>El cliente tiene bloqueo legal: no puede recibir créditos.</Vacio>
      ) : evaluacion.bloqueo ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          <strong>No se puede registrar un nuevo crédito.</strong> {evaluacion.bloqueo}{" "}
          <Link href={`/admin/clientes/${clienteId}`} className="font-semibold underline">Ver sus créditos</Link>
        </p>
      ) : (
        <>
          {evaluacion.alertaRiesgo && (
            <p role="alert" className="mb-5 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
              <strong>Cliente de riesgo.</strong> {evaluacion.alertaRiesgo}
            </p>
          )}
          {faltan.length > 0 && (
            <p role={bloqueaExpediente ? "alert" : "status"} className="mb-5 rounded-xl border border-gold bg-gold-soft/60 px-4 py-3 text-sm text-[#8a5d00]">
              <strong>{bloqueaExpediente ? "No se puede registrar: expediente incompleto." : "Advertencia: expediente incompleto."}</strong>{" "}
              Falta: {faltan.slice(0, 6).join(", ")}{faltan.length > 6 ? "…" : ""}.{" "}
              <Link href={`/admin/clientes/${clienteId}`} className="font-semibold underline">Completar en la ficha</Link>
            </p>
          )}
          {!bloqueaExpediente && (
            <FormCredito
              action={crearCredito}
              clienteId={clienteId}
              garantes={garantes}
              unidades={opciones.unidades}
              planes={opciones.planes}
              tasas={opciones.tasas}
              feriados={config.feriados}
              hoy={hoy}
              topeTea={config.topeTea}
              vehicularExigeGarante={config.vehicularExigeGarante}
              beneficio={evaluacion.nivel}
              puntaje={perfil.puntaje}
              alertaRiesgo={evaluacion.alertaRiesgo}
            />
          )}
        </>
      )}
    </>
  );
}
