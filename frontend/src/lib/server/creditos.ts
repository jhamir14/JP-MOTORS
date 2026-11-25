import "server-only";
import type postgres from "postgres";
import { feriadosDesdeConfig } from "@/lib/creditos";

type Db = postgres.Sql | postgres.TransactionSql;

export interface ConfigCreditos {
  feriados: string[];
  topeTea: number | null;
  exigeExpedienteCompleto: boolean;
  vehicularExigeGarante: boolean;
}

/** Parámetros de `configuracion` que usa el alta de créditos. */
export async function configCreditos(db: Db): Promise<ConfigCreditos> {
  const filas = await db<{ clave: string; valor: unknown }[]>`
    select clave, valor from public.configuracion
    where clave in ('feriados', 'tope_tea_porcentaje', 'credito_exige_expediente_completo', 'credito_vehicular_exige_garante')`;
  const v = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  const tope = Number(v.tope_tea_porcentaje);
  return {
    feriados: [...feriadosDesdeConfig(v.feriados)].sort(),
    topeTea: v.tope_tea_porcentaje != null && Number.isFinite(tope) && tope > 0 ? tope : null,
    exigeExpedienteCompleto: v.credito_exige_expediente_completo === true,
    vehicularExigeGarante: v.credito_vehicular_exige_garante !== false,
  };
}

export interface UnidadDisponible {
  id: string;
  tipo: "vehiculo" | "celular";
  descripcion: string;
  identificador: string;
  precio: number;
  productoId: string | null;
}

export interface PlanDisponible {
  id: string;
  productoId: string;
  nombre: string;
  cuotaInicial: number;
  numeroCuotas: number;
  frecuencia: string;
  tipoCalculo: string;
  tasaPorcentaje: number | null;
  montoCuota: number | null;
  publicado: boolean;
}

export interface TasaDisponible {
  id: string;
  servicio: string;
  nombre: string;
  frecuencia: string;
  tipoCalculo: string;
  tasaPorcentaje: number;
  cuotasMin: number;
  cuotasMax: number;
  penalidadDiaria: number;
}

/** Unidades que se pueden financiar (en stock o reservadas), con sus planes y las tasas vigentes. */
export async function opcionesAltaCredito(db: Db) {
  const [unidades, planes, tasas] = await Promise.all([
    db<UnidadDisponible[]>`
      select id, 'vehiculo' as tipo,
             marca || ' ' || modelo || coalesce(' ' || anio, '') || coalesce(' · ' || color, '') as descripcion,
             'Motor ' || numero_motor || coalesce(' · Placa ' || placa, '') as identificador,
             precio_lista::float8 as precio, producto_id as "productoId"
      from public.unidad_vehiculo where estado in ('EN_STOCK', 'RESERVADO')
      union all
      select id, 'celular',
             marca || ' ' || modelo || coalesce(' ' || almacenamiento, '') || coalesce(' · ' || color, ''),
             'IMEI ' || imei1, precio_lista::float8, producto_id
      from public.unidad_celular where estado in ('EN_STOCK', 'RESERVADO')
      order by descripcion`,
    db<PlanDisponible[]>`
      select id, producto_id as "productoId", coalesce(nombre, numero_cuotas || ' cuotas ' || lower(frecuencia::text)) as nombre,
             cuota_inicial::float8 as "cuotaInicial", numero_cuotas as "numeroCuotas", frecuencia, tipo_calculo as "tipoCalculo",
             tasa_porcentaje::float8 as "tasaPorcentaje", monto_cuota::float8 as "montoCuota", publicado
      from public.plan_credito order by producto_id, orden, numero_cuotas`,
    db<TasaDisponible[]>`
      select id, servicio, nombre, frecuencia, tipo_calculo as "tipoCalculo", tasa_porcentaje::float8 as "tasaPorcentaje",
             cuotas_min as "cuotasMin", cuotas_max as "cuotasMax", penalidad_diaria::float8 as "penalidadDiaria"
      from public.tasa_servicio
      where activa and servicio in ('CREDITO_VEHICULAR', 'CREDITO_CELULAR')
      order by servicio, frecuencia`,
  ]);
  return { unidades, planes, tasas };
}
