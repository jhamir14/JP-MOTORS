-- =============================================================================
-- Inversiones JP · Fase 1 · Datos iniciales (sin datos personales)
-- -----------------------------------------------------------------------------
-- Configuración, tasas por servicio y catálogo público. Los precios de
-- celulares y del Motokar salen del inventario de la base anterior.
-- Los clientes, créditos y pagos reales NO están aquí: se cargan con
-- database/importar_legado.py, que genera un SQL fuera del repositorio.
-- =============================================================================

insert into public.sucursal (nombre, direccion, distrito, provincia, departamento, telefono)
values ('Tienda Central', 'Por definir', null, null, null, '+51 902 423 015')
on conflict (nombre) do nothing;

insert into public.configuracion (clave, valor, descripcion, publica) values
  ('empresa', jsonb_build_object(
      'nombre', 'Inversiones JP',
      'razon_social', 'Inversiones Multimarca JP',
      'whatsapp', '51902423015',
      'horario', 'Lunes a sábado de 9:00 a. m. a 7:00 p. m.'),
   'Datos públicos de la empresa', true),
  ('tope_tea_porcentaje', 'null'::jsonb,
   'Tope de TEA permitido (Ley 31143 / BCRP). Debe fijarlo el área legal; null = sin bloqueo automático.', false),
  ('dias_gracia_mora', '3'::jsonb, 'Días de tolerancia para considerar una cuota pagada a tiempo (score del cliente)', false),
  ('cobro_diario_excluye_domingo', 'true'::jsonb, 'Los cronogramas diarios saltan los domingos', false),
  ('feriados', '["2026-01-01","2026-04-02","2026-04-03","2026-05-01","2026-06-07","2026-06-29","2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30","2026-10-08","2026-11-01","2026-12-08","2026-12-09","2026-12-25"]'::jsonb,
   'Feriados nacionales: no se generan cuotas diarias en estas fechas', false)
on conflict (clave) do nothing;

-- Tasas por servicio.
--   FRANCES: tasa por periodo (2.0 = 2 % mensual).  FLAT: % total sobre el capital para todo el plazo.
--   Los préstamos en efectivo replican las condiciones que se usaban en el sistema anterior
--   (20 % flat en 4 cuotas semanales o 24 cuotas diarias) y NO se publican en la web.
insert into public.tasa_servicio (servicio, categoria, nombre, frecuencia, tipo_calculo, tasa_porcentaje, cuotas_min, cuotas_max, penalidad_diaria, publica) values
  ('CREDITO_VEHICULAR', null,      'Crédito vehicular mensual',        'MENSUAL',   'FRANCES', 2.000,  6, 36, 5.00, true),
  ('CREDITO_CELULAR',   'CELULAR', 'Celular a crédito semanal',        'SEMANAL',   'FRANCES', 1.200,  8, 52, 2.00, true),
  ('CREDITO_CELULAR',   'CELULAR', 'Celular a crédito quincenal',      'QUINCENAL', 'FRANCES', 2.400,  4, 24, 2.00, true),
  ('PRESTAMO_EFECTIVO', null,      'Préstamo en efectivo semanal',     'SEMANAL',   'FLAT',   20.000,  4,  8, 2.00, false),
  ('PRESTAMO_EFECTIVO', null,      'Préstamo en efectivo diario',      'DIARIO',    'FLAT',   20.000, 24, 30, 2.00, false)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Catálogo público
-- -----------------------------------------------------------------------------
with productos (slug, categoria, marca, modelo, nombre, descripcion, precio, specs, etiquetas, destacado, orden, imagen) as (
  values
  ('honda-cb190r', 'MOTO_LINEAL'::public.categoria_producto, 'Honda', 'CB190R', 'Honda CB190R',
   'Naked street con espíritu racing: horquilla invertida dorada, inyección electrónica y frenos de disco en ambas ruedas.',
   11966.00, '{"Cilindrada":"184.4 cc","Transmisión":"5 velocidades","Alimentación":"Inyección electrónica","Frenos":"Disco / Disco","Potencia":"16.6 HP / 8,000 RPM","Peso":"141 kg"}'::jsonb,
   array['Deportiva'], true, 10, '/motos/cb190r.webp'),
  ('honda-cb125f-twister', 'MOTO_LINEAL', 'Honda', 'CB125F Twister', 'Honda CB125F Twister',
   'Líneas deportivas y peso ligero para el día a día. Ideal como primera moto para trabajar y moverte por la ciudad.',
   7695.20, '{"Cilindrada":"124.8 cc","Transmisión":"4 velocidades","Alimentación":"Carburador","Frenos":"Disco / Tambor","Potencia":"8.38 HP / 7,500 RPM","Peso":"117 kg"}'::jsonb,
   array['Trabajo','Urbana'], true, 20, '/motos/cb125f.webp'),
  ('honda-navi', 'MOTO_LINEAL', 'Honda', 'Navi', 'Honda Navi',
   'Mini scooter automática, liviana y muy económica en combustible: perfecta para el tráfico urbano.',
   5889.29, '{"Cilindrada":"109.19 cc","Transmisión":"Automática (V-Matic)","Alimentación":"Carburador","Frenos":"Tambor / Tambor","Potencia":"7.09 HP / 7,500 RPM","Peso":"101 kg"}'::jsonb,
   array['Urbana'], true, 30, '/motos/navi.webp'),
  ('honda-motokar-gl150', 'TRIMOVIL_PASAJEROS', 'Honda', 'Motokar GL150', 'Honda Motokar GL150',
   'El clásico motokar de pasajeros para trabajar en provincia y selva: motor 150 cc confiable y carreta techada.',
   14700.00, '{"Cilindrada":"150 cc","Uso":"Transporte de pasajeros","Condición":"0 km"}'::jsonb,
   array['Trimóvil','Trabajo'], true, 40, '/motos/nl150.webp'),

  ('apple-iphone-16', 'CELULAR', 'Apple', 'iPhone 16', 'iPhone 16',
   'El iPhone más reciente con cámara de 48 MP y chip A18. Llévalo en cuotas semanales.',
   3000.00, '{"Sistema":"iOS"}'::jsonb, array['Premium'], true, 110, null),
  ('apple-iphone-15-pro', 'CELULAR', 'Apple', 'iPhone 15 Pro', 'iPhone 15 Pro',
   'Titanio, chip A17 Pro y cámara profesional. Disponible a crédito con inicial flexible.',
   3800.00, '{"Sistema":"iOS"}'::jsonb, array['Premium'], true, 120, null),
  ('apple-iphone-15', 'CELULAR', 'Apple', 'iPhone 15', 'iPhone 15',
   'Dynamic Island, USB-C y cámara de 48 MP.',
   2700.00, '{"Sistema":"iOS"}'::jsonb, array['Premium'], false, 130, null),
  ('apple-iphone-13', 'CELULAR', 'Apple', 'iPhone 13', 'iPhone 13',
   'Un clásico confiable con excelente batería y cámara dual.',
   1850.00, '{"Sistema":"iOS"}'::jsonb, array['Gama media'], false, 140, null),
  ('samsung-galaxy-s24-plus', 'CELULAR', 'Samsung', 'Galaxy S24+', 'Samsung Galaxy S24+',
   'Pantalla de 6.7", Galaxy AI y cámara de 50 MP.',
   3000.00, '{"Sistema":"Android"}'::jsonb, array['Premium'], false, 150, null),
  ('samsung-galaxy-a56', 'CELULAR', 'Samsung', 'Galaxy A56', 'Samsung Galaxy A56 5G',
   'Gama media 5G con gran batería y actualizaciones por años.',
   1300.00, '{"Sistema":"Android"}'::jsonb, array['Gama media'], true, 160, null),
  ('xiaomi-redmi-note-13-pro-5g', 'CELULAR', 'Xiaomi', 'Redmi Note 13 Pro 5G', 'Xiaomi Redmi Note 13 Pro 5G',
   'Cámara de 200 MP, pantalla AMOLED de 120 Hz y carga rápida.',
   1800.00, '{"Sistema":"Android"}'::jsonb, array['Gama media'], true, 170, null),
  ('xiaomi-redmi-note-15', 'CELULAR', 'Xiaomi', 'Redmi Note 15', 'Xiaomi Redmi Note 15',
   'Batería para todo el día a un precio accesible.',
   900.00, '{"Sistema":"Android"}'::jsonb, array['Gama trabajo'], false, 180, null),
  ('honor-magic-7-lite', 'CELULAR', 'Honor', 'Magic 7 Lite', 'Honor Magic 7 Lite',
   'Batería de larga duración y pantalla resistente a caídas.',
   1250.00, '{"Sistema":"Android"}'::jsonb, array['Gama media'], false, 190, null),
  ('honor-x8c', 'CELULAR', 'Honor', 'X8c', 'Honor X8c',
   'Delgado, liviano y con excelente relación precio-calidad.',
   780.00, '{"Sistema":"Android"}'::jsonb, array['Gama trabajo'], false, 200, null)
),
ins as (
  insert into public.producto_catalogo (slug, categoria, marca, modelo, nombre, descripcion, precio_contado, specs, etiquetas, destacado, publicado, orden)
  select slug, categoria, marca, modelo, nombre, descripcion, precio, specs, etiquetas, destacado, true, orden from productos
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.imagen_producto (producto_id, url, alt, orden, es_portada)
select ins.id, p.imagen, p.nombre, 0, true
from ins join productos p using (slug)
where p.imagen is not null;
