-- =============================================================================
-- Inversiones JP · Plazos más largos para celulares (cuotas pequeñas)
-- -----------------------------------------------------------------------------
--   La web ofrece plazos desde 12 semanas, de 4 en 4, hasta el máximo de la gama, con cuota de
--   S/ 200 por semana o menos (src/lib/celularesJP.ts: gamaCelular y plazosCelular).
--   Aquí se pasa el plan JP publicado de cada celular a su plazo SUGERIDO (misma inicial), para que
--   las tarjetas («Cuota desde…») y la ficha muestren la cuota pequeña:
--     · menos de S/ 1,000: 16 sem · S/ 1,000–2,000: 20 sem · S/ 2,001–3,000: 24 sem · más de S/ 3,000: 28 sem o más
--   Igual que «Aplicar plan JP» del panel: los planes JP anteriores se borran, salvo los que ya usa
--   algún crédito, que solo se despublican. Fórmula idéntica a cotizarCelularJP.
-- Idempotente: si el plan ya está en el plazo sugerido, no cambia nada.
-- =============================================================================

create or replace function public.jp_cuota_celular(precio numeric, inicial numeric, semanas int, tasa numeric)
returns numeric language sql immutable set search_path = '' as $$
  select round((greatest(precio - inicial, 0)
               + round(greatest(precio - inicial, 0) * round(tasa * semanas / 4.0, 3) / 100)) / semanas)
$$;

do $$
declare
  p record;
  tasa numeric; base int; maximo int; sugerido int; s int; cuota numeric; ultimo int;
begin
  for p in
    select pc.id, pc.precio_contado as precio, pl.cuota_inicial as inicial, pl.numero_cuotas as semanas
    from public.producto_catalogo pc
    join lateral (
      select * from public.plan_credito x
      where x.producto_id = pc.id and x.publicado and x.frecuencia = 'SEMANAL' and x.nombre like 'Plan JP%'
      order by x.orden, x.created_at limit 1) pl on true
    where pc.categoria = 'CELULAR' and pc.precio_contado > 0
  loop
    select t, b, m into tasa, base, maximo from (values
      (p.precio < 1000, 15::numeric, 16, 24),
      (p.precio >= 1000 and p.precio <= 1500, 10, 20, 28),
      (p.precio > 1500 and p.precio <= 2000, 8, 20, 28),
      (p.precio > 2000 and p.precio <= 3000, 7.5, 24, 36),
      (p.precio > 3000, 5, 28, 48)) g(ok, t, b, m) where ok;

    sugerido := null; ultimo := null;
    s := 12;
    while s <= maximo loop
      cuota := public.jp_cuota_celular(p.precio, p.inicial, s, tasa);
      if cuota <= 200 then
        ultimo := s;
        if sugerido is null and s >= base then sugerido := s; end if;
      end if;
      s := s + 4;
    end loop;
    sugerido := coalesce(sugerido, ultimo, maximo);
    continue when sugerido = p.semanas;

    delete from public.plan_credito pl
    where pl.producto_id = p.id and pl.nombre like 'Plan JP%'
      and not exists (select 1 from public.credito cr where cr.plan_credito_id = pl.id);
    update public.plan_credito set publicado = false where producto_id = p.id and nombre like 'Plan JP%';
    insert into public.plan_credito (producto_id, nombre, cuota_inicial, numero_cuotas, frecuencia, tipo_calculo, tasa_porcentaje, monto_cuota, publicado, orden)
    values (p.id, 'Plan JP · ' || sugerido || ' semanas', p.inicial, sugerido, 'SEMANAL', 'FLAT',
            round(tasa * sugerido / 4.0, 3), public.jp_cuota_celular(p.precio, p.inicial, sugerido, tasa), true, 0);
  end loop;
end $$;
