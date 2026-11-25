import Link from "next/link";
import { Encabezado, Tabla, Vacio } from "@/components/admin/ui";
import { Badge, ButtonLink } from "@/components/ui";
import { ESTADOS_CLIENTE, ETIQUETA_ESTADO_CLIENTE, TONO_ESTADO_CLIENTE, normalizarDocumento, puedeEditarKyc, type EstadoCliente } from "@/lib/clientes";
import { cn } from "@/lib/cn";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";

export const metadata = { title: "Clientes" };

const POR_PAGINA = 50;
const FILTROS_SCORE = ["5", "4", "3", "2", "1", "sin"] as const;

interface Fila {
  id: string; nombres: string; apellidos: string; tipo_documento: string; numero_documento: string; telefono: string | null;
  distrito: string | null; estado: EstadoCliente; score_interno: number | null; datos_incompletos: boolean;
  creditos_activos: number; creditos_total: number;
}


export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; incompletos?: string; score?: string; orden?: string; p?: string }> }) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const estado = (ESTADOS_CLIENTE as readonly string[]).includes(sp.estado ?? "") ? sp.estado! : null;
  const incompletos = sp.incompletos === "1";
  const score = FILTROS_SCORE.includes(sp.score as (typeof FILTROS_SCORE)[number]) ? sp.score! : null;
  const orden = sp.orden === "score_desc" || sp.orden === "score_asc" ? sp.orden : null;
  const pagina = Math.max(1, Math.min(1000, Number(sp.p) || 1));
  const db = sql();

  const doc = normalizarDocumento(q);
  const texto = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const busqueda = q
    ? db`and (c.numero_documento like ${`${doc}%`} or c.telefono like ${`%${q.replace(/\D/g, "") || "x"}%`}
              or (c.nombres || ' ' || c.apellidos) ilike ${texto} or (c.apellidos || ' ' || c.nombres) ilike ${texto})`
    : db``;
  const filtroScore = score === "sin" ? db`and c.score_interno is null` : score ? db`and c.score_interno = ${Number(score)}` : db``;
  const ordenSql =
    orden === "score_desc" ? db`c.score_interno desc nulls last, c.apellidos, c.nombres`
    : orden === "score_asc" ? db`c.score_interno asc nulls last, c.apellidos, c.nombres`
    : db`c.apellidos, c.nombres`;

  const [filas, [conteo]] = await Promise.all([
    db<Fila[]>`
      select c.id, c.nombres, c.apellidos, c.tipo_documento, c.numero_documento, c.telefono, c.distrito, c.estado,
             c.score_interno, c.datos_incompletos,
             count(cr.id) filter (where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO'))::int as creditos_activos,
             count(cr.id) filter (where cr.estado <> 'ANULADO')::int as creditos_total
      from public.cliente c
      left join public.credito cr on cr.cliente_id = c.id
      where (${estado}::text is null or c.estado::text = ${estado}) and (not ${incompletos} or c.datos_incompletos) ${busqueda} ${filtroScore}
      group by c.id
      order by ${ordenSql}
      limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`,
    db<{ total: number; incompletos: number }[]>`
      select count(*)::int as total, count(*) filter (where c.datos_incompletos)::int as incompletos
      from public.cliente c
      where (${estado}::text is null or c.estado::text = ${estado}) ${busqueda} ${filtroScore}`,
  ]);

  const enlace = (cambios: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | null> = { q: q || null, estado, incompletos: incompletos ? "1" : null, score, orden, ...cambios };
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/admin/clientes?${s}` : "/admin/clientes";
  };
  const totalPaginas = Math.max(1, Math.ceil((incompletos ? conteo.incompletos : conteo.total) / POR_PAGINA));

  return (
    <>
      <Encabezado
        titulo="Clientes"
        acciones={puedeEditarKyc(sesion.rol) ? <ButtonLink href="/admin/clientes/nuevo" variant="brand" size="sm">+ Nuevo cliente</ButtonLink> : null}
      >
        Expedientes KYC, garantes, documentos y créditos de cada cliente.
        {conteo.incompletos > 0 && ` ${conteo.incompletos} con datos por completar.`}
      </Encabezado>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="DNI, nombre, apellido o celular"
          aria-label="Buscar cliente"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand md:max-w-md"
        />
        {estado && <input type="hidden" name="estado" value={estado} />}
        {incompletos && <input type="hidden" name="incompletos" value="1" />}
        {score && <input type="hidden" name="score" value={score} />}
        {orden && <input type="hidden" name="orden" value={orden} />}
        <button type="submit" className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Buscar</button>
        {q && <Link href={enlace({ q: null, p: null })} className="self-center text-xs font-semibold text-danger">Limpiar ✕</Link>}
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {[null, ...ESTADOS_CLIENTE].map((e) => (
          <Link
            key={e ?? "todos"}
            href={enlace({ estado: e, p: null })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              estado === e ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
            )}
          >
            {e ? ETIQUETA_ESTADO_CLIENTE[e] : "Todos"}
          </Link>
        ))}
        <Link
          href={enlace({ incompletos: incompletos ? null : "1", p: null })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold",
            incompletos ? "border-gold bg-gold-soft text-[#8a5d00]" : "border-line bg-surface hover:border-gold",
          )}
        >
          ⚠ Datos incompletos ({conteo.incompletos})
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-muted">Score:</span>
        {[null, ...FILTROS_SCORE].map((f) => (
          <Link
            key={f ?? "todos"}
            href={enlace({ score: f, p: null })}
            className={cn(
              "rounded-full border px-3 py-1.5 font-semibold",
              score === f ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
            )}
          >
            {f == null ? "Todos" : f === "sin" ? "Sin historial" : <><span className={score === f ? "" : "text-gold"}>{"★".repeat(Number(f))}</span> {f}</>}
          </Link>
        ))}
        <span className="ml-2 font-semibold text-muted">Ordenar:</span>
        {([[null, "Nombre"], ["score_desc", "Mejor score"], ["score_asc", "Menor score"]] as const).map(([o, etiqueta]) => (
          <Link
            key={etiqueta}
            href={enlace({ orden: o, p: null })}
            className={cn("rounded-full border px-3 py-1.5 font-semibold", orden === o ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand")}
          >
            {etiqueta}
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <Vacio>{q ? `Ningún cliente coincide con «${q}».` : "No hay clientes con este filtro."}</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr><th>Cliente</th><th>Documento</th><th>Celular</th><th>Distrito</th><th>Créditos</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/clientes/${c.id}`} className="font-semibold text-brand hover:underline">
                    {c.apellidos}, {c.nombres}
                  </Link>
                  {c.datos_incompletos && <div className="text-xs font-semibold text-[#8a5d00]">⚠ Expediente incompleto</div>}
                </td>
                <td className="font-mono text-xs whitespace-nowrap">{c.tipo_documento === "DNI" ? "" : `${c.tipo_documento} `}{c.numero_documento}</td>
                <td className="whitespace-nowrap">{c.telefono ?? <span className="text-muted">—</span>}</td>
                <td>{c.distrito ?? <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap tabular">
                  {c.creditos_activos > 0 ? <strong>{c.creditos_activos} activo{c.creditos_activos > 1 ? "s" : ""}</strong> : null}
                  {c.creditos_total > c.creditos_activos && <span className="text-muted"> {c.creditos_activos ? "· " : ""}{c.creditos_total - c.creditos_activos} cerrado{c.creditos_total - c.creditos_activos > 1 ? "s" : ""}</span>}
                  {c.creditos_total === 0 && <span className="text-muted">—</span>}
                </td>
                <td>
                  <Badge tone={TONO_ESTADO_CLIENTE[c.estado]}>{ETIQUETA_ESTADO_CLIENTE[c.estado]}</Badge>
                  {c.score_interno != null && <span className="ml-1.5 text-xs text-gold" title={`Score ${c.score_interno} de 5`}>{"★".repeat(c.score_interno)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {totalPaginas > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-center gap-3 text-sm">
          {pagina > 1 && <Link href={enlace({ p: String(pagina - 1) })} className="font-semibold text-brand">← Anterior</Link>}
          <span className="text-muted">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas && <Link href={enlace({ p: String(pagina + 1) })} className="font-semibold text-brand">Siguiente →</Link>}
        </nav>
      )}
    </>
  );
}
