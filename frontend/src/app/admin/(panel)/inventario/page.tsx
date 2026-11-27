import Link from "next/link";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, CampoTexto, Encabezado, Estado, Panel, Tabla, Vacio } from "@/components/admin/ui";
import {
  CONDICIONES_UNIDAD,
  ESTADOS_GPS,
  ESTADOS_UNIDAD_MANUALES,
  PLATAFORMAS_BLOQUEO,
  SISTEMAS_OPERATIVOS,
  TIPOS_VEHICULO,
  legible,
  opcionesLegibles,
} from "@/lib/admin/constantes";
import { inventariosDe } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { puede, requerirSeccion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { cambiarEstadoUnidad, ingresarCelular, ingresarVehiculo } from "./actions";

export const metadata = { title: "Inventario" };

interface UnidadVehiculo {
  id: string; marca: string; modelo: string; anio: number | null; color: string | null; numero_motor: string; numero_chasis: string;
  placa: string | null; estado_gps: string; estado: string; precio_lista: number; producto: string | null;
}
interface UnidadCelular {
  id: string; marca: string; modelo: string; almacenamiento: string | null; color: string | null; imei1: string;
  plataforma_bloqueo: string; estado_bloqueo: string; estado: string; precio_lista: number; producto: string | null;
}

function FormEstado({ id, tipo, estado }: { id: string; tipo: "vehiculo" | "celular"; estado: string }) {
  if (!(ESTADOS_UNIDAD_MANUALES as readonly string[]).includes(estado)) return <Estado valor={estado} />;
  return (
    <AdminForm action={cambiarEstadoUnidad} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value={tipo} />
      <select name="estado" defaultValue={estado} aria-label="Estado" className="rounded-lg border border-line bg-surface px-2 py-1 text-xs">
        {ESTADOS_UNIDAD_MANUALES.map((e) => <option key={e} value={e}>{legible(e)}</option>)}
      </select>
      <BotonEnviar size="sm" variant="secondary" className="px-2.5 py-1 text-xs" pendiente="…">OK</BotonEnviar>
    </AdminForm>
  );
}

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tipo?: string; producto?: string; estado?: string }> }) {
  const sesion = await requerirSeccion("inventario");
  const sp = await searchParams;
  // Cada administrador ve solo su inventario: motos o celulares.
  const inventarios = inventariosDe(sesion.rol);
  const tipo = inventarios.length === 1 ? inventarios[0] : sp.tipo === "celulares" ? "celulares" : "vehiculos";
  const producto = /^[0-9a-f-]{36}$/.test(sp.producto ?? "") ? sp.producto! : null;
  const estado = sp.estado === "todos" ? null : (sp.estado ?? "EN_STOCK");
  const db = sql();
  const puedeIngresar = puede(sesion, "SUPERADMIN", "ADMIN_MOTOS", "ADMIN_CELULARES", "ASESOR_VENTAS") && inventarios.includes(tipo);

  const [productos, conteo] = await Promise.all([
    db<{ id: string; nombre: string; categoria: string }[]>`
      select id, nombre, categoria from public.producto_catalogo
      where categoria ${tipo === "celulares" ? db`= 'CELULAR'` : db`in ('MOTO_LINEAL', 'TRIMOVIL_PASAJEROS', 'TRIMOVIL_CARGA')`}
      order by nombre`,
    db<{ vehiculos: number; celulares: number }[]>`
      select (select count(*) from public.unidad_vehiculo where estado = 'EN_STOCK')::int as vehiculos,
             (select count(*) from public.unidad_celular where estado = 'EN_STOCK')::int as celulares`,
  ]);

  const vehiculos =
    tipo === "vehiculos"
      ? await db<UnidadVehiculo[]>`
          select u.id, u.marca, u.modelo, u.anio, u.color, u.numero_motor, u.numero_chasis, u.placa, u.estado_gps, u.estado,
                 u.precio_lista::float8, p.nombre as producto
          from public.unidad_vehiculo u left join public.producto_catalogo p on p.id = u.producto_id
          where (${producto}::uuid is null or u.producto_id = ${producto}) and (${estado}::text is null or u.estado::text = ${estado})
          order by u.created_at desc limit 300`
      : [];
  const celulares =
    tipo === "celulares"
      ? await db<UnidadCelular[]>`
          select u.id, u.marca, u.modelo, u.almacenamiento, u.color, u.imei1, u.plataforma_bloqueo, u.estado_bloqueo, u.estado,
                 u.precio_lista::float8, p.nombre as producto
          from public.unidad_celular u left join public.producto_catalogo p on p.id = u.producto_id
          where (${producto}::uuid is null or u.producto_id = ${producto}) and (${estado}::text is null or u.estado::text = ${estado})
          order by u.created_at desc limit 300`
      : [];

  const opcionesProducto = [{ value: "", label: "— Sin vincular —" }, ...productos.map((p) => ({ value: p.id, label: p.nombre }))];
  const enlace = (cambios: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const base = { tipo, producto, estado: sp.estado ?? null, ...cambios };
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
    return `/admin/inventario?${params}`;
  };

  return (
    <>
      <Encabezado titulo="Inventario">
        Cada unidad física con sus identificadores. El stock visible en la web es la cantidad de unidades «En stock» de cada producto.
      </Encabezado>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {inventarios.length > 1 && (["vehiculos", "celulares"] as const).map((t) => (
          <Link
            key={t}
            href={enlace({ tipo: t, producto: null })}
            className={cn("rounded-xl px-4 py-2 text-sm font-semibold", tipo === t ? "bg-brand text-white" : "border border-line bg-surface hover:border-brand")}
          >
            {t === "vehiculos" ? `Motos y trimóviles (${conteo[0].vehiculos})` : `Celulares (${conteo[0].celulares})`}
          </Link>
        ))}
        {inventarios.length > 1 && <span className="mx-2 hidden h-6 w-px bg-line md:block" />}
        {[{ v: null, l: "En stock" }, { v: "todos", l: "Todos" }, { v: "RESERVADO", l: "Reservados" }, { v: "VENDIDO_CREDITO", l: "Vendidos a crédito" }].map((o) => (
          <Link
            key={o.l}
            href={enlace({ estado: o.v })}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", (sp.estado ?? null) === o.v ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface")}
          >
            {o.l}
          </Link>
        ))}
        {producto && <Link href={enlace({ producto: null })} className="text-xs font-semibold text-danger">Quitar filtro de producto ✕</Link>}
      </div>

      {puedeIngresar && (
        <details className="mb-6 rounded-2xl border border-line-soft bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden" open={producto != null}>
          <summary className="cursor-pointer list-none p-5 font-semibold text-brand">
            + Ingresar {tipo === "vehiculos" ? "moto o trimóvil" : "celular"} al stock
          </summary>
          <div className="border-t border-line-soft p-5">
            {tipo === "vehiculos" ? (
              <AdminForm action={ingresarVehiculo} resetOnSuccess className="grid gap-4 md:grid-cols-3">
                <CampoSelect label="Producto del catálogo" name="productoId" defaultValue={producto ?? ""} opciones={opcionesProducto} hint="Marca, modelo y precio se completan desde el producto si los dejas vacíos." className="md:col-span-2" />
                <CampoSelect label="Tipo" name="tipoVehiculo" opciones={opcionesLegibles(TIPOS_VEHICULO)} />
                <CampoTexto label="Marca" name="marca" />
                <CampoTexto label="Modelo" name="modelo" />
                <CampoTexto label="Año" name="anio" inputMode="numeric" placeholder={String(new Date().getFullYear())} />
                <CampoTexto label="N.º de motor" name="numeroMotor" required />
                <CampoTexto label="N.º de chasis / VIN" name="numeroChasis" required maxLength={17} hint="17 caracteres" />
                <CampoTexto label="Placa" name="placa" placeholder="Vacío = en trámite" />
                <CampoTexto label="Color" name="color" />
                <CampoSelect label="Condición" name="condicion" opciones={opcionesLegibles(CONDICIONES_UNIDAD)} />
                <CampoTexto label="Precio de lista (S/)" name="precioLista" inputMode="decimal" />
                <CampoTexto label="Tarjeta de propiedad" name="tarjetaPropiedad" />
                <CampoTexto label="Proveedor GPS" name="proveedorGps" placeholder="Tracksolid, Concox…" />
                <CampoTexto label="IMEI del GPS" name="imeiGps" />
                <CampoTexto label="SIM del GPS" name="simGps" />
                <CampoSelect label="Estado GPS" name="estadoGps" opciones={opcionesLegibles(ESTADOS_GPS)} />
                <CampoArea label="Notas" name="notas" rows={2} className="md:col-span-2" />
                <div className="md:col-span-3"><BotonEnviar>Ingresar al stock</BotonEnviar></div>
              </AdminForm>
            ) : (
              <AdminForm action={ingresarCelular} resetOnSuccess className="grid gap-4 md:grid-cols-3">
                <CampoSelect label="Producto del catálogo" name="productoId" defaultValue={producto ?? ""} opciones={opcionesProducto} hint="Marca, modelo y precio se completan desde el producto si los dejas vacíos." className="md:col-span-2" />
                <CampoSelect label="Sistema" name="sistemaOperativo" opciones={opcionesLegibles(SISTEMAS_OPERATIVOS)} />
                <CampoTexto label="Marca" name="marca" />
                <CampoTexto label="Modelo" name="modelo" />
                <CampoTexto label="Color" name="color" />
                <CampoTexto label="IMEI 1" name="imei1" inputMode="numeric" maxLength={15} required hint="Marca *#06# en el equipo" />
                <CampoTexto label="IMEI 2" name="imei2" inputMode="numeric" maxLength={15} />
                <CampoTexto label="N.º de serie" name="numeroSerie" />
                <CampoTexto label="Almacenamiento" name="almacenamiento" placeholder="256 GB" />
                <CampoTexto label="RAM" name="memoriaRam" placeholder="8 GB" />
                <CampoSelect label="Condición" name="condicion" opciones={opcionesLegibles(CONDICIONES_UNIDAD)} />
                <CampoTexto label="Precio de lista (S/)" name="precioLista" inputMode="decimal" />
                <CampoSelect label="Plataforma de bloqueo" name="plataformaBloqueo" opciones={opcionesLegibles(PLATAFORMAS_BLOQUEO)} />
                <CampoTexto label="ID de enrolamiento / cuenta" name="idEnrolamiento" hint="Nunca anotes contraseñas del cliente." />
                <CampoArea label="Notas" name="notas" rows={2} className="md:col-span-3" />
                <div className="md:col-span-3"><BotonEnviar>Ingresar al stock</BotonEnviar></div>
              </AdminForm>
            )}
          </div>
        </details>
      )}

      {tipo === "vehiculos" ? (
        vehiculos.length === 0 ? (
          <Vacio>No hay unidades con este filtro.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr><th>Unidad</th><th>Motor / Chasis</th><th>Placa</th><th>GPS</th><th className="text-right">Precio</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {vehiculos.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-semibold">{u.marca} {u.modelo}</div>
                    <div className="text-xs text-muted">{[u.anio, u.color, u.producto ? `→ ${u.producto}` : "sin vincular"].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="font-mono text-xs">{u.numero_motor}<br />{u.numero_chasis}</td>
                  <td className="whitespace-nowrap">{u.placa ?? <span className="text-muted">en trámite</span>}</td>
                  <td className="text-xs whitespace-nowrap">{legible(u.estado_gps)}</td>
                  <td className="text-right tabular whitespace-nowrap">{formatSoles(u.precio_lista)}</td>
                  <td>{puedeIngresar ? <FormEstado id={u.id} tipo="vehiculo" estado={u.estado} /> : <Estado valor={u.estado} />}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )
      ) : celulares.length === 0 ? (
        <Vacio>No hay equipos con este filtro.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr><th>Equipo</th><th>IMEI 1</th><th>Bloqueo</th><th className="text-right">Precio</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {celulares.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="font-semibold">{u.marca} {u.modelo}</div>
                  <div className="text-xs text-muted">{[u.almacenamiento, u.color, u.producto ? `→ ${u.producto}` : "sin vincular"].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="font-mono text-xs">{u.imei1}</td>
                <td className="text-xs whitespace-nowrap">{legible(u.plataforma_bloqueo)} · {legible(u.estado_bloqueo)}</td>
                <td className="text-right tabular whitespace-nowrap">{formatSoles(u.precio_lista)}</td>
                <td>{puedeIngresar ? <FormEstado id={u.id} tipo="celular" estado={u.estado} /> : <Estado valor={u.estado} />}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      <Panel className="mt-6" titulo="¿Cómo se usa?">
        <ul className="list-disc pl-5 text-sm text-muted">
          <li>Vincula cada unidad a su producto del catálogo para que la ficha pública muestre «En stock».</li>
          <li>Los estados «Vendido a crédito» e «Incautado» los asigna el módulo de créditos (Fase 4); aquí no se pueden editar.</li>
          <li>Validaciones: VIN de 17 caracteres e IMEI de 15 dígitos con dígito verificador.</li>
        </ul>
      </Panel>
    </>
  );
}
