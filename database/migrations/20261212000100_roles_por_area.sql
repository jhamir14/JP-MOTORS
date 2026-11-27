-- =============================================================================
-- Inversiones JP · Administradores por área (1/2): nuevos roles
-- -----------------------------------------------------------------------------
--   En lugar del asesor de ventas, cada área tiene su administrador:
--     · ADMIN_CREDITOS  → préstamos de dinero (ya existía)
--     · ADMIN_MOTOS     → créditos de motos, motokar y toritos, su catálogo e inventario
--     · ADMIN_CELULARES → créditos de celulares, su catálogo e inventario
--   ASESOR_VENTAS queda solo para cuentas antiguas (el superadmin las reasigna en «Personal»).
--   Va en un archivo aparte: un valor nuevo de un enum no se puede usar en la misma transacción
--   en la que se crea, y cada migración corre en su propia transacción.
-- Idempotente: se puede volver a ejecutar.
-- =============================================================================

alter type public.rol_usuario add value if not exists 'ADMIN_MOTOS';
alter type public.rol_usuario add value if not exists 'ADMIN_CELULARES';
