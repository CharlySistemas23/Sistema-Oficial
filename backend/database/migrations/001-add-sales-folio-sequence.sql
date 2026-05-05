-- Migración 001: Folios atómicos para sales
-- Fecha: 2026-05-05
-- Problema: timestamp + random colisiona bajo carga; ventas rechazadas con
--           "duplicate key value violates unique constraint sales_folio_key"
-- Fix: SEQUENCE PostgreSQL atómica + función next_sale_folio(branch_code)
--
-- Idempotente: se puede correr múltiples veces sin efecto secundario.
-- Reversible: ver bloque DROP al final (comentado).

BEGIN;

-- 1. Secuencia global (atómica por definición)
CREATE SEQUENCE IF NOT EXISTS sales_folio_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- 2. Función que arma el folio: <BRANCH_CODE>-<8 dígitos>
--    Si no se pasa branch_code, usa "SALE" (compat con código viejo).
CREATE OR REPLACE FUNCTION next_sale_folio(p_branch_code TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num   BIGINT;
  v_pref  TEXT;
BEGIN
  v_num := nextval('sales_folio_seq');
  v_pref := COALESCE(NULLIF(TRIM(p_branch_code), ''), 'SALE');
  RETURN v_pref || '-' || LPAD(v_num::TEXT, 8, '0');
END;
$$;

-- 3. Avanzar la secuencia para evitar colisión con folios existentes.
--    Toma como punto de partida el correlativo más alto que ya exista en sales,
--    parseando los últimos 8 dígitos del folio cuando matchean el formato nuevo.
DO $$
DECLARE
  v_max BIGINT := 0;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(folio FROM '-([0-9]{8,})$')::BIGINT), 0)
    INTO v_max
    FROM sales
   WHERE folio ~ '-[0-9]{8,}$';

  IF v_max > 0 THEN
    PERFORM setval('sales_folio_seq', v_max);
    RAISE NOTICE 'sales_folio_seq alineada en %', v_max;
  END IF;
END $$;

-- 4. Índice compuesto (branch_id, folio) — la búsqueda por sucursal+folio era full scan
CREATE INDEX IF NOT EXISTS idx_sales_branch_folio ON sales (branch_id, folio);

COMMIT;

-- ============================================================================
-- ROLLBACK (si algo sale mal):
--   BEGIN;
--   DROP INDEX IF EXISTS idx_sales_branch_folio;
--   DROP FUNCTION IF EXISTS next_sale_folio(TEXT);
--   DROP SEQUENCE IF EXISTS sales_folio_seq;
--   COMMIT;
