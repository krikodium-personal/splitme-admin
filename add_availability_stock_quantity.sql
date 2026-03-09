-- Añadir columnas availability y stock_quantity a menu_items
-- availability: control manual de disponibilidad (toggle verde/rojo)
-- stock_quantity: si tiene valor, rige la disponibilidad; al llegar a 0 se pone availability=FALSE

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS availability BOOLEAN DEFAULT true;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;

-- Migrar datos existentes: availability = is_available
UPDATE menu_items SET availability = COALESCE(is_available, true) WHERE availability IS NULL;

COMMENT ON COLUMN menu_items.availability IS 'Disponibilidad manual. Si stock_quantity tiene valor, al llegar a 0 se pone FALSE automáticamente.';
COMMENT ON COLUMN menu_items.stock_quantity IS 'Stock disponible. NULL = no se considera stock, solo availability. Si tiene valor, cada venta resta 1 y al llegar a 0 se pone availability=FALSE.';

-- Trigger: al insertar order_items, restar stock_quantity y poner availability=FALSE si llega a 0
CREATE OR REPLACE FUNCTION decrement_menu_item_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_qty INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- Solo si el menu_item tiene stock_quantity definido
  SELECT stock_quantity INTO v_qty FROM menu_items WHERE id = NEW.menu_item_id;
  IF v_qty IS NOT NULL THEN
    v_new_stock := GREATEST(0, v_qty - COALESCE(NEW.quantity, 1));
    UPDATE menu_items
    SET stock_quantity = v_new_stock,
        availability = CASE WHEN v_new_stock <= 0 THEN false ELSE availability END,
        is_available = CASE WHEN v_new_stock <= 0 THEN false ELSE is_available END
    WHERE id = NEW.menu_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_menu_item_stock ON order_items;
CREATE TRIGGER trg_decrement_menu_item_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_menu_item_stock();
