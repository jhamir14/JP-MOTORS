"use server";
import { ROLES_CREDITOS } from "@/lib/creditos";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";

export interface SugerenciaCliente {
  id: string;
  nombre: string;
  documento: string;
  telefono: string | null;
  asesor: string | null;
  bloqueado: boolean;
}

/** Sugerencias del buscador de clientes (DNI, nombre o celular) mientras se escribe. */
export async function buscarClientes(texto: string): Promise<SugerenciaCliente[]> {
  await requerirSesion(...ROLES_CREDITOS);
  const q = String(texto ?? "").trim().slice(0, 60);
  if (q.length < 2) return [];
  const patron = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const inicio = `${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return sql()<SugerenciaCliente[]>`
    select c.id, c.nombres || ' ' || c.apellidos as nombre, c.numero_documento as documento, c.telefono,
           nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as asesor,
           c.estado = 'BLOQUEADO_LEGAL' as bloqueado
    from public.cliente c
    left join public.perfil_usuario p on p.id = c.registrado_por
    where c.numero_documento ilike ${patron} or c.telefono ilike ${patron}
       or (c.nombres || ' ' || c.apellidos) ilike ${patron} or (c.apellidos || ' ' || c.nombres) ilike ${patron}
    order by (c.numero_documento ilike ${inicio} or c.nombres ilike ${inicio} or c.apellidos ilike ${inicio}) desc, c.apellidos, c.nombres
    limit 8`;
}
