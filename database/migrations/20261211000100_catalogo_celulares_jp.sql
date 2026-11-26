-- =============================================================================
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
                          '\m(4g|5g|apple|samsung|xiaomi|zte|motorola)\M', '', 'g'),
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
  (1, 'Apple', 'iPhone 15', 'iPhone 15', 'apple-iphone-15', 2800, '{"Sistema":"iOS","RAM":"6GB","Almacenamiento":"128GB","Red":"5G","Procesador":"A16 Bionic","Pantalla":"6.1\" OLED","Cámara":"48+12 MP"}'::jsonb, 'Plan JP · 29 semanas', 300, 29, 54.375, 133),
  (2, 'Apple', 'iPhone 16', 'iPhone 16', 'apple-iphone-16', 3000, '{"Sistema":"iOS","RAM":"8GB","Almacenamiento":"128GB","Red":"5G","Procesador":"A18 Bionic","Pantalla":"6.1\" OLED","Cámara":"48+12 MP"}'::jsonb, 'Plan JP · 32 semanas', 300, 32, 60, 135),
  (3, 'Apple', 'iPhone 16 Pro Max', 'iPhone 16 Pro Max', 'apple-iphone-16-pro-max', 4200, '{"Sistema":"iOS","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"A18 Pro","Pantalla":"6.9\" 120Hz","Cámara":"48+48+12 MP Tele 5x"}'::jsonb, 'Plan JP · 30 semanas', 500, 30, 37.5, 170),
  (4, 'Apple', 'iPhone 17', 'iPhone 17', 'apple-iphone-17', 3500, '{"Sistema":"iOS","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"A19 Bionic","Pantalla":"6.3\" 120Hz","Cámara":"48+48 MP"}'::jsonb, 'Plan JP · 35 semanas', 300, 35, 43.75, 131),
  (5, 'Apple', 'iPhone 17 Pro', 'iPhone 17 Pro', 'apple-iphone-17-pro', 4600, '{"Sistema":"iOS","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"A19 Pro","Pantalla":"6.3\" 120Hz","Cámara":"48+48+48 MP Tele 5x"}'::jsonb, 'Plan JP · 32 semanas', 500, 32, 40, 179),
  (6, 'Apple', 'iPhone 17 Pro Max', 'iPhone 17 Pro Max', 'apple-iphone-17-pro-max', 4950, '{"Sistema":"iOS","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"A19 Pro","Pantalla":"6.9\" 120Hz","Cámara":"48+48+48 MP Tele 5x"}'::jsonb, 'Plan JP · 40 semanas', 300, 40, 50, 174),
  (7, 'Apple', 'iPhone 18 Pro Max', 'iPhone 18 Pro Max', 'apple-iphone-18-pro-max', 6400, '{"Sistema":"iOS","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"A20 Pro","Pantalla":"6.9\" 120Hz","Cámara":"48+48+48 MP Zoom 10x"}'::jsonb, 'Plan JP · 38 semanas', 500, 38, 47.5, 229),
  (8, 'Samsung', 'Galaxy A17 4G', 'Samsung Galaxy A17 4G', 'samsung-galaxy-a17-4g', 950, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"4G","Procesador":"Helio G99","Pantalla":"6.7\" 90Hz","Cámara":"50 MP OIS","Batería":"5000 mAh"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 60, 80),
  (9, 'Samsung', 'Galaxy A27 5G', 'Samsung Galaxy A27 5G', 'samsung-galaxy-a27-5g', 1150, '{"Sistema":"Android","RAM":"6GB","Almacenamiento":"128GB","Red":"5G","Procesador":"Snapdragon 6 Gen 3","Pantalla":"6.7\" 120Hz","Cámara":"50 MP OIS"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 88),
  (10, 'Samsung', 'Galaxy A36 5G', 'Samsung Galaxy A36 5G', 'samsung-galaxy-a36-5g', 1250, '{"Sistema":"Android","RAM":"6GB","Almacenamiento":"128GB","Red":"5G","Procesador":"Snapdragon 6 Gen 3","Pantalla":"6.7\" 120Hz","Cámara":"50 MP OIS","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 96),
  (11, 'Samsung', 'Galaxy A54 5G', 'Samsung Galaxy A54 5G', 'samsung-galaxy-a54-5g', 1350, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Exynos 1380","Pantalla":"6.4\" 120Hz","Cámara":"50 MP OIS","Resistencia":"IP67"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 105),
  (12, 'Samsung', 'Galaxy A56 5G', 'Samsung Galaxy A56 5G', 'samsung-galaxy-a56', 1600, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Exynos 1580","Pantalla":"6.7\" 120Hz","Cámara":"50 MP OIS","Resistencia":"IP67","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 116),
  (13, 'Samsung', 'Galaxy A57 5G', 'Samsung Galaxy A57 5G', 'samsung-galaxy-a57-5g', 1800, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Exynos 1680","Pantalla":"6.7\" 120Hz","Cámara":"50 MP OIS","Resistencia":"IP68","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 132),
  (14, 'ZTE', 'Nubia Neo 3 GT', 'Nubia Neo 3 GT', 'zte-nubia-neo-3-gt', 950, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Unisoc T9100","Pantalla":"OLED 120Hz","Batería":"6000 mAh","Carga rápida":"80W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 60, 80),
  (15, 'ZTE', 'Nubia Air 5G', 'Nubia Air 5G', 'zte-nubia-air-5g', 1000, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"UNISOC 5G","Pantalla":"6.78\" 1.5K 120Hz","Resistencia":"IP68/IP69/IP69K"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 74),
  (16, 'ZTE', 'Nubia Neo 5 5G', 'Nubia Neo 5 5G', 'zte-nubia-neo-5-5g', 1100, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Unisoc T9300","Pantalla":"6.8\" 120Hz","Batería":"6050 mAh","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 83),
  (17, 'ZTE', 'Nubia Focus 2 Ultra', 'Nubia Focus 2 Ultra', 'zte-nubia-focus-2-ultra', 1150, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"512GB","Red":"5G","Pantalla":"Sensor 1/1.55\" con Anillo Reflex","Batería":"5000 mAh","Carga rápida":"33W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 88),
  (18, 'ZTE', 'Nubia Focus Pro 5G', 'Nubia Focus Pro 5G', 'zte-nubia-focus-pro-5g', 1200, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Cámara":"Cámara 108 MP OIS","Carga rápida":"33W","Destacado":"Kit Fotográfico Pro"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 92),
  (19, 'ZTE', 'Nubia Neo 5 GT 5G', 'Nubia Neo 5 GT 5G', 'zte-nubia-neo-5-gt-5g', 1250, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7400","Pantalla":"144Hz","Carga rápida":"80W","Destacado":"Ventilador Activo"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 96),
  (20, 'Honor', 'X7D 5G', 'Honor X7D 5G', 'honor-x7d-5g', 1000, '{"Sistema":"Android","RAM":"6GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Snapdragon 6s Gen 3","Batería":"6500 mAh","Destacado":"Botón IA"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 74),
  (21, 'Honor', 'X8C 5G', 'Honor X8C 5G', 'honor-x8c', 1150, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7025-Ultra","Cámara":"108 MP","Pantalla":"AMOLED FHD+"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 88),
  (22, 'Honor', '400 Lite 5G', 'Honor 400 Lite 5G', 'honor-400-lite-5g', 1400, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7025-Ultra","Cámara":"108 MP","Pantalla":"AMOLED 120Hz","Resistencia":"IP65"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 109),
  (23, 'Honor', 'Magic 7 Lite', 'Honor Magic 7 Lite', 'honor-magic-7-lite', 1700, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Snapdragon 6 Gen 1","Cámara":"108 MP OIS","Batería":"6600 mAh","Carga rápida":"66W"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 124),
  (24, 'Honor', 'Magic 8 Lite', 'Honor Magic 8 Lite', 'honor-magic-8-lite', 1800, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"512GB","Red":"5G","Procesador":"Snapdragon 6 Gen 4","Batería":"Batería Récord 8300 mAh","Resistencia":"IP69K"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 132),
  (25, 'Honor', '400 5G', 'Honor 400 5G', 'honor-400-5g', 1900, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"512GB","Red":"5G","Procesador":"Snapdragon 7 Gen 3","Cámara":"200 MP OIS","Batería":"6000 mAh","Carga rápida":"80W"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 140),
  (26, 'Honor', '400 Pro 5G', 'Honor 400 Pro 5G', 'honor-400-pro-5g', 2600, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"512GB","Red":"5G","Procesador":"Snapdragon 8s Gen 3","Cámara":"50+50+12 MP","Carga rápida":"100W","Destacado":"Retrato Harcourt"}'::jsonb, 'Plan JP · 16 semanas', 300, 16, 30, 187),
  (27, 'Xiaomi', 'Redmi Note 14', 'Redmi Note 14', 'xiaomi-redmi-note-14', 900, '{"Sistema":"Android","RAM":"6GB","Almacenamiento":"128GB","Red":"4G","Procesador":"Helio G99-Ultra","Cámara":"108 MP","Pantalla":"120Hz","Batería":"5500 mAh"}'::jsonb, 'Plan JP · 16 semanas', 120, 16, 60, 78),
  (28, 'Xiaomi', 'Redmi Note 15 4G', 'Redmi Note 15 4G', 'xiaomi-redmi-note-15', 1050, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"4G","Procesador":"Helio G100-Ultra","Cámara":"108 MP","Batería":"6000 mAh","Carga rápida":"33W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 79),
  (29, 'Xiaomi', 'Redmi Note 14 Pro 5G', 'Redmi Note 14 Pro 5G', 'xiaomi-redmi-note-14-pro-5g', 1250, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7300-Ultra","Cámara":"200 MP OIS","Resistencia":"IP68","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 96),
  (30, 'Xiaomi', 'Redmi Note 15 Pro 4G', 'Redmi Note 15 Pro 4G', 'xiaomi-redmi-note-15-pro-4g', 1500, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"512GB","Red":"4G","Procesador":"Helio G200-Ultra","Cámara":"200 MP OIS","Batería":"6500 mAh","Carga rápida":"45W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 118),
  (31, 'Xiaomi', 'Poco X7 Pro', 'Poco X7 Pro', 'xiaomi-poco-x7-pro', 1450, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"512GB","Red":"5G","Procesador":"Dimensity 8400-Ultra","Pantalla":"1.5K 120Hz","Batería":"6000 mAh","Carga rápida":"90W","Resistencia":"IP68"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 114),
  (32, 'Xiaomi', 'Poco X8 Pro', 'Poco X8 Pro', 'xiaomi-poco-x8-pro', 1650, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"512GB","Red":"5G","Procesador":"Dimensity 8500-Ultra","Carga rápida":"100W","Batería":"6500 mAh","Resistencia":"IP68"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 120),
  (33, 'Motorola', 'Moto G56 5G', 'Moto G56 5G', 'motorola-moto-g56-5g', 1050, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7060","Cámara":"50 MP","Resistencia":"IP68/IP69","Destacado":"Selfie 32 MP"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 79),
  (34, 'Motorola', 'Moto G77 5G', 'Moto G77 5G', 'motorola-moto-g77-5g', 1400, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 6400","Cámara":"108 MP","Pantalla":"pOLED 1.5K 120Hz","Destacado":"Gemini"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 109),
  (35, 'Motorola', 'Moto Edge 50 Fusión', 'Moto Edge 50 Fusión', 'motorola-moto-edge-50-fusion', 1450, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Snapdragon 7s Gen 2","Cámara":"Sony Lytia 50 MP OIS","Pantalla":"144Hz","Carga rápida":"68W"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 114),
  (36, 'Motorola', 'Moto G86 Power', 'Moto G86 Power', 'motorola-moto-g86-power', 1500, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Dimensity 7300","Batería":"6720 mAh","Cámara":"50 MP OIS","Resistencia":"IP68/IP69"}'::jsonb, 'Plan JP · 16 semanas', 150, 16, 40, 118),
  (37, 'Motorola', 'Moto Edge 70 Fusión', 'Moto Edge 70 Fusión', 'motorola-moto-edge-70-fusion', 1650, '{"Sistema":"Android","RAM":"8GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Snapdragon 7s Gen 3","Batería":"7000 mAh","Carga rápida":"68W","Pantalla":"144Hz","Resistencia":"IP68/IP69"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 120),
  (38, 'Motorola', 'Moto Edge 50 + Buds (Combo)', 'Moto Edge 50 + Buds (Combo)', 'motorola-moto-edge-50-buds-combo', 1700, '{"Sistema":"Android","RAM":"12GB","Almacenamiento":"256GB","Red":"5G","Procesador":"Snapdragon 7 Gen 1 AE","Destacado":"Telefoto · Audífonos Buds incluidos"}'::jsonb, 'Plan JP · 16 semanas', 200, 16, 32, 124);

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

drop table celular_jp;
