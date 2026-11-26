-- =============================================================================
-- Inversiones JP · Asesor de ventas de cada crédito o préstamo
-- -----------------------------------------------------------------------------
--   El formulario de alta muestra y guarda quién es el asesor de ventas del cliente
--   (por defecto, quien registró al cliente). Los créditos anteriores toman a quien los creó.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

alter table public.credito add column if not exists asesor_id uuid references auth.users (id);

update public.credito set asesor_id = creado_por
where asesor_id is null and creado_por is not null;

create index if not exists credito_asesor_idx on public.credito (asesor_id) where asesor_id is not null;
