-- =============================================================================
-- Inversiones JP · Se deja de vender repuestos
-- -----------------------------------------------------------------------------
--   · Borra del catálogo los productos de categoría REPUESTO (sus imágenes y planes
--     se borran en cascada).
--   · Si alguno quedó referenciado por una unidad o una solicitud, no se borra: solo
--     se despublica y se quita de destacados, para no romper el historial.
--   · El valor REPUESTO se mantiene en el enum categoria_producto (PostgreSQL no permite
--     quitar valores de un enum sin recrearlo); la web y el panel ya no lo usan.
--   · Las tasas que apuntaban a REPUESTO se desactivan.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

delete from public.producto_catalogo p
where p.categoria = 'REPUESTO'
  and not exists (select 1 from public.unidad_vehiculo u where u.producto_id = p.id)
  and not exists (select 1 from public.unidad_celular u where u.producto_id = p.id)
  and not exists (select 1 from public.solicitud_credito s where s.producto_id = p.id);

update public.producto_catalogo
set publicado = false, destacado = false
where categoria = 'REPUESTO' and (publicado or destacado);

update public.tasa_servicio
set activa = false
where categoria = 'REPUESTO' and activa;
