-- Corregir orders.total_amount: NUNCA incluir order_batches con status='CREADO'
-- El total solo debe sumar items de batches ENVIADO, PREPARANDO, LISTO, SERVIDO

-- 1. Función que recalcula total_amount de una orden (excluyendo batches CREADO)
CREATE OR REPLACE FUNCTION sync_order_total_amount(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(oi.unit_price * COALESCE(oi.quantity, 1)), 0)
  INTO v_total
  FROM order_items oi
  INNER JOIN order_batches ob ON ob.id = oi.batch_id AND ob.order_id = p_order_id
  WHERE ob.status != 'CREADO';

  UPDATE orders
  SET total_amount = v_total
  WHERE id = p_order_id;
END;
$$;

-- 2. Función trigger para order_items: recalcular cuando insert/update/delete
CREATE OR REPLACE FUNCTION trg_sync_order_total_on_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Obtener order_id: del batch o del item (order_items tiene order_id)
  IF TG_OP = 'DELETE' THEN
    IF OLD.batch_id IS NOT NULL THEN
      SELECT ob.order_id INTO v_order_id FROM order_batches ob WHERE ob.id = OLD.batch_id;
    END IF;
    IF v_order_id IS NULL THEN
      v_order_id := OLD.order_id;
    END IF;
  ELSE
    IF NEW.batch_id IS NOT NULL THEN
      SELECT ob.order_id INTO v_order_id FROM order_batches ob WHERE ob.id = NEW.batch_id;
    END IF;
    IF v_order_id IS NULL THEN
      v_order_id := NEW.order_id;
    END IF;
  END IF;

  IF v_order_id IS NOT NULL THEN
    PERFORM sync_order_total_amount(v_order_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Función trigger para order_batches: recalcular cuando cambia el status (especialmente CREADO <-> otros)
CREATE OR REPLACE FUNCTION trg_sync_order_total_on_batch_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.order_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM sync_order_total_amount(NEW.order_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Crear triggers
DROP TRIGGER IF EXISTS trg_sync_order_total_on_item_insert ON order_items;
CREATE TRIGGER trg_sync_order_total_on_item_insert
  AFTER INSERT ON order_items
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION trg_sync_order_total_on_item_change();

DROP TRIGGER IF EXISTS trg_sync_order_total_on_item_update ON order_items;
CREATE TRIGGER trg_sync_order_total_on_item_update
  AFTER UPDATE OF batch_id, unit_price, quantity ON order_items
  FOR EACH ROW
  WHEN (
    OLD.batch_id IS DISTINCT FROM NEW.batch_id
    OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
    OR OLD.quantity IS DISTINCT FROM NEW.quantity
  )
  EXECUTE FUNCTION trg_sync_order_total_on_item_change();

DROP TRIGGER IF EXISTS trg_sync_order_total_on_item_delete ON order_items;
CREATE TRIGGER trg_sync_order_total_on_item_delete
  AFTER DELETE ON order_items
  FOR EACH ROW
  WHEN (OLD.batch_id IS NOT NULL)
  EXECUTE FUNCTION trg_sync_order_total_on_item_change();

DROP TRIGGER IF EXISTS trg_sync_order_total_on_batch_status ON order_batches;
CREATE TRIGGER trg_sync_order_total_on_batch_status
  AFTER UPDATE OF status ON order_batches
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_order_total_on_batch_status_change();

-- 5. Corregir datos existentes: recalcular total_amount de todas las órdenes activas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM orders LOOP
    PERFORM sync_order_total_amount(r.id);
  END LOOP;
  RAISE NOTICE 'Total_amount recalculado para todas las órdenes (excluyendo batches CREADO)';
END;
$$;
