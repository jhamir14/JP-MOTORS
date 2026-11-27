"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import {
  CONDICIONES_UNIDAD,
  ESTADOS_GPS,
  ESTADOS_UNIDAD_MANUALES,
  PLATAFORMAS_BLOQUEO,
  SISTEMAS_OPERATIVOS,
  TIPOS_VEHICULO,
} from "@/lib/admin/constantes";
import { esImeiValido, esPlacaValida, esVinValido } from "@/lib/validaciones";
import { inventariosDe } from "@/lib/areas";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";

/** Inventario: superadmin y los administradores de motos y de celulares (cada uno, solo el suyo). */
const ROLES = ["SUPERADMIN", "ADMIN_MOTOS", "ADMIN_CELULARES", "ASESOR_VENTAS"] as const;
const FUERA_DE_AREA = "Este inventario no es de tu área.";

const opcional = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const precioOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "Usa solo números")
  .transform((v) => (v === "" ? null : Number(v)));

/** Marca, modelo y precio de lista se toman del producto del catálogo si se dejan vacíos. */
async function datosProducto(productoId: string | null) {
  if (!productoId) return null;
  const [p] = await sql()<{ marca: string; modelo: string; precio: number; categoria: string }[]>`
    select marca, modelo, precio_contado::float8 as precio, categoria from public.producto_catalogo where id = ${productoId}`;
  return p ?? null;
}

function refrescar() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout"); // el stock se muestra en la web ("En stock")
}

// -----------------------------------------------------------------------------
const vehiculoSchema = z
  .object({
    productoId: z.string().uuid().or(z.literal("").transform(() => null)),
    tipoVehiculo: z.enum(TIPOS_VEHICULO),
    marca: z.string().trim().max(60),
    modelo: z.string().trim().max(80),
    anio: z.string().trim().regex(/^(19|20|21)\d{2}$|^$/, "Año de 4 dígitos").transform((v) => (v ? Number(v) : null)),
    color: opcional(40),
    condicion: z.enum(CONDICIONES_UNIDAD),
    precioLista: precioOpcional,
    numeroMotor: z.string().trim().toUpperCase().min(4, "Ingresa el número de motor").max(40),
    numeroChasis: z.string().trim().toUpperCase().refine(esVinValido, "El VIN / chasis tiene 17 caracteres (sin I, O ni Q)"),
    placa: z.string().trim().toUpperCase().refine(esPlacaValida, "Placa no válida (ej. 1234-AB)").transform((v) => v || null),
    tarjetaPropiedad: opcional(40),
    proveedorGps: opcional(60),
    imeiGps: opcional(40),
    simGps: opcional(30),
    estadoGps: z.enum(ESTADOS_GPS),
    notas: opcional(500),
  });

export async function ingresarVehiculo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES);
  if (!inventariosDe(sesion.rol).includes("vehiculos")) return fallo(FUERA_DE_AREA);
  const parsed = vehiculoSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los campos marcados.", erroresZod(parsed.error));
  const d = parsed.data;
  const p = await datosProducto(d.productoId);
  const marca = d.marca || p?.marca;
  const modelo = d.modelo || p?.modelo;
  const precio = d.precioLista ?? p?.precio;
  if (!marca) return fallo("Indica la marca o elige un producto del catálogo.", { marca: "Requerido" });
  if (!modelo) return fallo("Indica el modelo o elige un producto del catálogo.", { modelo: "Requerido" });
  if (precio == null) return fallo("Indica el precio de lista o elige un producto del catálogo.", { precioLista: "Requerido" });

  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.unidad_vehiculo ${tx({
        producto_id: d.productoId,
        tipo_vehiculo: d.tipoVehiculo,
        marca, modelo, anio: d.anio, color: d.color, condicion: d.condicion, precio_lista: precio,
        numero_motor: d.numeroMotor, numero_chasis: d.numeroChasis, placa: d.placa, tarjeta_propiedad: d.tarjetaPropiedad,
        proveedor_gps: d.proveedorGps, imei_gps: d.imeiGps, sim_gps: d.simGps, estado_gps: d.estadoGps, notas: d.notas,
      })}`);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe una unidad con ese número de motor, chasis o placa.");
    return fallo(mensajeErrorBD(e));
  }
  refrescar();
  return exito(`Unidad ${marca} ${modelo} (${d.numeroChasis}) ingresada al stock.`);
}

// -----------------------------------------------------------------------------
const celularSchema = z.object({
  productoId: z.string().uuid().or(z.literal("").transform(() => null)),
  marca: z.string().trim().max(60),
  modelo: z.string().trim().max(80),
  almacenamiento: opcional(20),
  memoriaRam: opcional(20),
  color: opcional(40),
  sistemaOperativo: z.enum(SISTEMAS_OPERATIVOS),
  condicion: z.enum(CONDICIONES_UNIDAD),
  precioLista: precioOpcional,
  imei1: z.string().trim().refine(esImeiValido, "IMEI no válido (15 dígitos; revisa el dígito verificador)"),
  imei2: z.string().trim().refine((v) => v === "" || esImeiValido(v), "IMEI 2 no válido").transform((v) => v || null),
  numeroSerie: opcional(40),
  plataformaBloqueo: z.enum(PLATAFORMAS_BLOQUEO),
  idEnrolamiento: opcional(120),
  notas: opcional(500),
});

export async function ingresarCelular(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES);
  if (!inventariosDe(sesion.rol).includes("celulares")) return fallo(FUERA_DE_AREA);
  const parsed = celularSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los campos marcados.", erroresZod(parsed.error));
  const d = parsed.data;
  if (d.imei2 && d.imei2 === d.imei1) return fallo("El IMEI 2 no puede ser igual al IMEI 1.", { imei2: "Repetido" });
  const p = await datosProducto(d.productoId);
  const marca = d.marca || p?.marca;
  const modelo = d.modelo || p?.modelo;
  const precio = d.precioLista ?? p?.precio;
  if (!marca) return fallo("Indica la marca o elige un producto del catálogo.", { marca: "Requerido" });
  if (!modelo) return fallo("Indica el modelo o elige un producto del catálogo.", { modelo: "Requerido" });
  if (precio == null) return fallo("Indica el precio de lista o elige un producto del catálogo.", { precioLista: "Requerido" });

  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.unidad_celular ${tx({
        producto_id: d.productoId, marca, modelo, almacenamiento: d.almacenamiento, memoria_ram: d.memoriaRam, color: d.color,
        sistema_operativo: d.sistemaOperativo, condicion: d.condicion, precio_lista: precio, imei1: d.imei1, imei2: d.imei2,
        numero_serie: d.numeroSerie, plataforma_bloqueo: d.plataformaBloqueo, id_enrolamiento: d.idEnrolamiento, notas: d.notas,
      })}`);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe un equipo con ese IMEI.", { imei1: "IMEI ya registrado" });
    return fallo(mensajeErrorBD(e));
  }
  refrescar();
  return exito(`Equipo ${marca} ${modelo} (IMEI ${d.imei1}) ingresado al stock.`);
}

// -----------------------------------------------------------------------------
const estadoSchema = z.object({
  id: z.string().uuid(),
  tipo: z.enum(["vehiculo", "celular"]),
  estado: z.enum(ESTADOS_UNIDAD_MANUALES),
});

export async function cambiarEstadoUnidad(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES);
  const parsed = estadoSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Estado no válido.");
  const { id, tipo, estado } = parsed.data;
  if (!inventariosDe(sesion.rol).includes(tipo === "vehiculo" ? "vehiculos" : "celulares")) return fallo(FUERA_DE_AREA);
  try {
    const r = await comoUsuario(sesion, (tx) =>
      tipo === "vehiculo"
        ? tx`update public.unidad_vehiculo set estado = ${estado}
             where id = ${id} and estado in ('EN_STOCK', 'RESERVADO', 'VENDIDO_CONTADO', 'DADO_DE_BAJA')`
        : tx`update public.unidad_celular set estado = ${estado}
             where id = ${id} and estado in ('EN_STOCK', 'RESERVADO', 'VENDIDO_CONTADO', 'DADO_DE_BAJA')`,
    );
    if (r.count === 0) return fallo("Esta unidad está vinculada a un crédito; su estado lo cambia el módulo de créditos.");
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar();
  return exito("Estado actualizado.");
}
