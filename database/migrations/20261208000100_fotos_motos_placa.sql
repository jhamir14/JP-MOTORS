-- =============================================================================
-- Inversiones JP · Nuevas fotos de las motos y alta de la Honda Motokar GL125
-- -----------------------------------------------------------------------------
--   Las fotos de /motos/modelos/ vienen recortadas con fondo transparente: la web
--   las muestra sobre la placa azul marino con el anillo dorado (estilo del sitio).
--   Solo reemplaza la portada sembrada por las migraciones (las fotos que se hayan
--   subido desde /admin no se tocan).
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

update public.imagen_producto i
set url = n.url
from public.producto_catalogo p,
     (values ('honda-navi',            '/motos/navi.webp',   '/motos/modelos/honda-navi.webp'),
             ('honda-cb190r',          '/motos/cb190r.webp', '/motos/modelos/honda-cb190r.webp'),
             ('honda-cb125f-twister',  '/motos/cb125f.webp', '/motos/modelos/honda-cb125f-twister.webp'),
             ('honda-motokar-gl150',   '/motos/nl150.webp',  '/motos/modelos/honda-motokar-gl150.webp')
     ) as n (slug, anterior, url)
where i.producto_id = p.id and p.slug = n.slug and i.url = n.anterior;

with ins as (
  insert into public.producto_catalogo (slug, categoria, marca, modelo, nombre, descripcion, precio_contado, specs, etiquetas, destacado, publicado, orden)
  values ('honda-motokar-gl125', 'TRIMOVIL_PASAJEROS', 'Honda', 'Motokar GL125', 'Honda Motokar GL125',
          'Motokar de pasajeros con el motor Honda 125 cc de siempre: económico, resistente y listo para trabajar desde el primer día.',
          8000.00, '{"Cilindrada":"125 cc","Uso":"Transporte de pasajeros","Condición":"0 km"}'::jsonb,
          array['Trimóvil','Trabajo'], true, true, 45)
  on conflict (slug) do nothing
  returning id
)
insert into public.imagen_producto (producto_id, url, alt, orden, es_portada)
select id, '/motos/modelos/honda-motokar-gl125.webp', 'Honda Motokar GL125', 0, true from ins;
