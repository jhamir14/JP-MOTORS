-- =============================================================================
-- Inversiones JP · Nueva tasa del crédito vehicular (motos, motokar y toritos)
-- -----------------------------------------------------------------------------
--   Referencia del negocio: Honda Motokar NL150, S/ 8,800 al contado,
--   financiada en 400 cuotas diarias de S/ 33 (total S/ 13,200).
--   Tasa implícita (cuota fija, sistema francés): 0.218 % por día.
--   Esa misma tasa se aplica a todos los vehículos. Plazos de 100 a 400 días.
--   · La tasa vehicular mensual deja de mostrarse en la web (sigue activa en el panel).
--   · Se publica la tasa vehicular diaria.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

update public.tasa_servicio
set publica = false, updated_at = now()
where servicio = 'CREDITO_VEHICULAR' and frecuencia <> 'DIARIO' and publica;

update public.tasa_servicio
set tipo_calculo = 'FRANCES', tasa_porcentaje = 0.218, cuotas_min = 100, cuotas_max = 400,
    publica = true, updated_at = now()
where servicio = 'CREDITO_VEHICULAR' and categoria is null and frecuencia = 'DIARIO' and activa;

insert into public.tasa_servicio (servicio, categoria, nombre, frecuencia, tipo_calculo, tasa_porcentaje, cuotas_min, cuotas_max, penalidad_diaria, publica)
select 'CREDITO_VEHICULAR', null, 'Crédito vehicular diario', 'DIARIO', 'FRANCES', 0.218, 100, 400, 5.00, true
where not exists (
  select 1 from public.tasa_servicio
  where servicio = 'CREDITO_VEHICULAR' and categoria is null and frecuencia = 'DIARIO' and activa
);
