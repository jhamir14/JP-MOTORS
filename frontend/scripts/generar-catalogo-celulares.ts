/**
 * Genera la migración que carga el catálogo oficial de celulares (src/data/celularesJP.ts)
 * y aplica la metodología JP a todos los celulares del catálogo.
 *
 *   npx tsx scripts/generar-catalogo-celulares.ts > ../database/migrations/20261211000100_catalogo_celulares_jp.sql
 */
import { CELULARES_JP } from "../src/data/celularesJP";
import { cotizarCelularJP, planJP, slugCelular, specsCelular } from "../src/lib/celularesJP";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const filas = CELULARES_JP.map((c, i) => {
  const r = cotizarCelularJP(c.precio, c.inicial, c.semanas, c.tasaMensual);
  if (r.cuota !== c.cuota) throw new Error(`La cuota de ${c.nombre} no cuadra (${r.cuota} ≠ ${c.cuota})`);
  const p = planJP(r);
  const modelo = c.nombre.replace(new RegExp(`^${c.marca}\\s+`, "i"), "");
  const slug = slugCelular(c);
  return `  (${i + 1}, ${q(c.marca)}, ${q(modelo)}, ${q(c.nombre)}, ${q(slug)}, ${c.precio}, ${q(JSON.stringify(specsCelular(c.specs, c.marca)))}::jsonb, ` +
    `${q(p.nombre)}, ${p.cuota_inicial}, ${p.numero_cuotas}, ${p.tasa_porcentaje}, ${p.monto_cuota})`;
});

console.log(`-- =============================================================================
-- Catálogo oficial de celulares (38 modelos) y metodología JP de financiamiento.
-- GENERADO con: npx tsx frontend/scripts/generar-catalogo-celulares.ts  (no editar a mano)
--
-- Metodología (src/lib/celularesJP.ts): interés simple mensual según el precio al contado
--   < S/ 1,000: 15 % · S/ 1,000–1,500: 10 % · S/ 1,501–2,000: 8 % · S/ 2,001–3,000: 7.5 % · > S/ 3,000: 5 %
--   Interés = round(Saldo × tasa × semanas/4) · Cuota semanal = round((Saldo + Interés) / semanas)
-- Cada plan JP se guarda como SEMANAL + FLAT, tasa_porcentaje = interés total del plazo y
-- monto_cuota = la cuota redondeada (el cronograma cobra exactamente esa cuota).
--
-- 1) Los 38 modelos: si ya existe un celular con el mismo nombre (sin marca ni «4G/5G») se actualiza;
--    si no, se crea y se publica.
-- 2) Todo celular del catálogo (incluidos los que no están en la lista) queda con un único plan
--    publicado «Plan JP · N semanas». Los planes anteriores se borran, o se despublican si algún
--    crédito ya los usa.
-- =============================================================================
create or replace function public.clave_celular(nombre text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(translate(lower(nombre), 'áéíóúüñ', 'aeiouun'),
                          '\\m(4g|5g|apple|samsung|xiaomi|zte|motorola)\\M', '', 'g'),
           '[^a-z0-9]', '', 'g')
$$;
comment on function public.clave_celular(text) is 'Nombre de un celular sin marca, red (4G/5G), tildes ni espacios: sirve para reconocer el mismo modelo.';

/** Metodología JP: tasa mensual, inicial y semanas por defecto según el precio al contado. */
create or replace function public.plan_celular_jp(precio numeric, inicial numeric default null, semanas int default null)
returns table (nombre text, cuota_inicial numeric, numero_cuotas int, tasa_porcentaje numeric, monto_cuota numeric)
language sql immutable as $$
  with g as (
    select case when precio < 1000 then 15 when precio <= 1500 then 10 when precio <= 2000 then 8
                when precio <= 3000 then 7.5 else 5 end::numeric as tasa,
           coalesce(inicial, case when precio <= 1500 then 150 when precio <= 2000 then 200
                                  when precio <= 3000 then 300 else 500 end)::numeric as ini,
           coalesce(semanas, case when precio <= 3000 then 16 else 32 end) as sem
  ), c as (
    select g.*, greatest(precio - g.ini, 0) as saldo, round(g.tasa * g.sem / 4.0, 3) as pct from g
  )
  select 'Plan JP · ' || c.sem || ' semanas', c.ini, c.sem, c.pct,
         round((c.saldo + round(c.saldo * c.pct / 100)) / c.sem)
  from c
$$;
comment on function public.plan_celular_jp(numeric, numeric, int) is 'Plan semanal de un celular con la metodología JP (ver src/lib/celularesJP.ts).';

create temporary table celular_jp (
  orden int, marca text, modelo text, nombre text, slug text, precio numeric, specs jsonb,
  plan_nombre text, cuota_inicial numeric, numero_cuotas int, tasa_porcentaje numeric, monto_cuota numeric
);

insert into celular_jp values
${filas.join(",\n")};

-- 1) Actualiza los que ya existen (mismo modelo) ...
update public.producto_catalogo p
set marca = c.marca, modelo = c.modelo, nombre = c.nombre, precio_contado = c.precio,
    specs = p.specs || c.specs, orden = c.orden, publicado = true
from celular_jp c
where p.categoria = 'CELULAR' and public.clave_celular(p.nombre) = public.clave_celular(c.nombre);

-- ... y crea los que faltan.
insert into public.producto_catalogo (slug, categoria, marca, modelo, nombre, precio_contado, specs, publicado, orden)
select c.slug, 'CELULAR', c.marca, c.modelo, c.nombre, c.precio, c.specs, true, c.orden
from celular_jp c
where not exists (select 1 from public.producto_catalogo p
                  where p.categoria = 'CELULAR' and public.clave_celular(p.nombre) = public.clave_celular(c.nombre))
on conflict (slug) do nothing;

-- 2) Planes: fuera los anteriores de todos los celulares (despublicados si un crédito los usa) ...
delete from public.plan_credito pl
using public.producto_catalogo p
where pl.producto_id = p.id and p.categoria = 'CELULAR'
  and not exists (select 1 from public.credito cr where cr.plan_credito_id = pl.id);
update public.plan_credito pl set publicado = false
from public.producto_catalogo p
where pl.producto_id = p.id and p.categoria = 'CELULAR';

-- ... un plan JP por celular: el de la lista oficial, o el que da la metodología según su precio.
insert into public.plan_credito (producto_id, nombre, cuota_inicial, numero_cuotas, frecuencia, tipo_calculo, tasa_porcentaje, monto_cuota, publicado, orden)
select p.id, c.plan_nombre, c.cuota_inicial, c.numero_cuotas, 'SEMANAL', 'FLAT', c.tasa_porcentaje, c.monto_cuota, true, 0
from public.producto_catalogo p
join celular_jp c on public.clave_celular(p.nombre) = public.clave_celular(c.nombre)
where p.categoria = 'CELULAR';

insert into public.plan_credito (producto_id, nombre, cuota_inicial, numero_cuotas, frecuencia, tipo_calculo, tasa_porcentaje, monto_cuota, publicado, orden)
select p.id, j.nombre, j.cuota_inicial, j.numero_cuotas, 'SEMANAL', 'FLAT', j.tasa_porcentaje, j.monto_cuota, true, 0
from public.producto_catalogo p
cross join lateral public.plan_celular_jp(p.precio_contado) j
where p.categoria = 'CELULAR' and j.monto_cuota > 0
  and not exists (select 1 from celular_jp c where public.clave_celular(c.nombre) = public.clave_celular(p.nombre));

drop table celular_jp;`);
