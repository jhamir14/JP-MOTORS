import "server-only";
import type postgres from "postgres";
import { documentosEquivalentes, faltantesCliente, type DatosKyc, type TipoDocumento } from "@/lib/clientes";

type Db = postgres.Sql | postgres.TransactionSql;

export interface ClienteResumen {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
}

/** Clientes que son la misma persona (mismo documento o RUC 10 ↔ DNI), sin contar `excluirId`. */
export async function clientesConDocumento(db: Db, tipo: TipoDocumento, numero: string, excluirId?: string | null) {
  const eq = documentosEquivalentes(tipo, numero);
  return db<ClienteResumen[]>`
    select id, nombres, apellidos, tipo_documento, numero_documento
    from public.cliente
    where (tipo_documento::text, numero_documento) in (select * from unnest(${eq.map((d) => d.tipo)}::text[], ${eq.map((d) => d.numero)}::text[]))
      and (${excluirId ?? null}::uuid is null or id <> ${excluirId ?? null})
    limit 1`;
}

export async function garantesConDocumento(db: Db, tipo: TipoDocumento, numero: string) {
  const eq = documentosEquivalentes(tipo, numero);
  return db<(ClienteResumen & { telefono: string | null; direccion: string | null })[]>`
    select id, nombres, apellidos, tipo_documento, numero_documento, telefono, direccion
    from public.garante
    where (tipo_documento::text, numero_documento) in (select * from unnest(${eq.map((d) => d.tipo)}::text[], ${eq.map((d) => d.numero)}::text[]))
    limit 1`;
}

/** Columnas que se usan para calcular la completitud del expediente. */
export const COLUMNAS_KYC = [
  "tipo_documento", "numero_documento", "fecha_nacimiento", "sexo", "estado_civil", "telefono", "direccion", "distrito",
  "provincia", "departamento", "referencia", "tipo_vivienda", "latitud", "longitud", "ocupacion", "ingreso_mensual",
] as const;

/** Recalcula `cliente.datos_incompletos` según los datos y documentos actuales. Devuelve lo que falta. */
export async function actualizarCompletitud(tx: Db, clienteId: string): Promise<string[]> {
  const [c] = await tx<(DatosKyc & { datos_incompletos: boolean })[]>`
    select ${tx(COLUMNAS_KYC as unknown as string[])}, datos_incompletos from public.cliente where id = ${clienteId}`;
  if (!c) return [];
  const docs = await tx<{ tipo: string }[]>`select distinct tipo from public.documento_kyc where cliente_id = ${clienteId}`;
  const falta = faltantesCliente(c, docs.map((d) => d.tipo));
  const incompleto = falta.length > 0;
  if (incompleto !== c.datos_incompletos) {
    await tx`update public.cliente set datos_incompletos = ${incompleto} where id = ${clienteId}`;
  }
  return falta;
}
