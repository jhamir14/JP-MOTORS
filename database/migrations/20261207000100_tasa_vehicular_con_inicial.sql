-- =============================================================================
-- Inversiones JP · Ajuste de la tasa vehicular y precio de la Motokar GL150
-- -----------------------------------------------------------------------------
--   Trato en tienda: Honda Motokar GL150 a S/ 8,800 al contado; financiada con
--   S/ 1,000 de inicial + 400 cuotas diarias de S/ 33 (los S/ 33 no incluyen la inicial).
--   ⇒ se financian S/ 7,800 y la tasa implícita (francés) es 0.290 % por día.
--   Reemplaza el 0.218 % de 20261206000100. Se aplica a todos los vehículos.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

update public.tasa_servicio
set tipo_calculo = 'FRANCES', tasa_porcentaje = 0.290, cuotas_min = 100, cuotas_max = 400,
    publica = true, updated_at = now()
where servicio = 'CREDITO_VEHICULAR' and categoria is null and frecuencia = 'DIARIO' and activa;

update public.producto_catalogo
set precio_contado = 8800.00, updated_at = now()
where slug = 'honda-motokar-gl150' and precio_contado <> 8800.00;
