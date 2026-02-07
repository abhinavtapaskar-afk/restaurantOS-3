
-- RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT 'Nanded',
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE,
  theme_color TEXT DEFAULT '#10b981',
  secondary_theme_color TEXT DEFAULT '#059669',
  font TEXT DEFAULT 'Poppins',
  hero_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_opacity INT DEFAULT 60,
  about_us TEXT,
  address TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  instagram_url TEXT,
  opening_hours TEXT,
  google_maps_url TEXT,
  upi_id TEXT,
  is_accepting_orders BOOLEAN DEFAULT true,
  total_tables INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INVENTORY TABLE (MYSTIC WARDROBE)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL, -- e.g., kg, L, pcs, g, ml
  cost_price NUMERIC NOT NULL DEFAULT 0,
  min_stock_alert NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, item_name)
);

-- MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT,
  is_veg BOOLEAN DEFAULT true,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MENU ITEM INGREDIENTS TABLE (Link between Menu Items and Inventory)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, inventory_id)
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  order_details JSONB,
  items JSONB, -- Legacy compatibility
  subtotal NUMERIC,
  total_amount NUMERIC,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, out_for_delivery, delivered, cancelled
  payment_method TEXT DEFAULT 'COD', -- COD, UPI
  order_type TEXT DEFAULT 'DELIVERY', -- DELIVERY, DINE_IN
  table_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- Public can read restaurants, menu items
CREATE POLICY "Public read access" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public menu read access" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public inventory for menu" ON inventory FOR SELECT USING (true);
CREATE POLICY "Public recipes for menu" ON menu_item_ingredients FOR SELECT USING (true);


-- Owners can manage their own data
CREATE POLICY "Owners can manage their own restaurant" ON restaurants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Owners can manage their menu items" ON menu_items FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owners can manage their inventory" ON inventory FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owners can manage their recipe items" ON menu_item_ingredients FOR ALL USING (menu_item_id IN (SELECT mi.id FROM menu_items mi JOIN restaurants r ON mi.restaurant_id = r.id WHERE r.owner_id = auth.uid()));
CREATE POLICY "Owners can manage their orders" ON orders FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owners can manage their reviews" ON reviews FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Public can place orders and create reviews
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can create reviews" ON reviews FOR INSERT WITH CHECK (true);


-- =================================================================================
--    DATABASE TRIGGER: AUTOMATIC INVENTORY DEDUCTION (GHOST DEDUCT)
-- =================================================================================
-- This function is automatically called when an order's status is updated.
-- If the new status is 'preparing', it deducts the required ingredients from stock.
--
CREATE OR REPLACE FUNCTION deduct_inventory_on_prepare()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    recipe_ingredient RECORD;
BEGIN
    -- Only run when status changes TO 'preparing' from something else
    IF NEW.status = 'preparing' AND OLD.status <> 'preparing' THEN
        -- Loop through each item in the order_details JSONB array
        FOR order_item IN SELECT * FROM jsonb_to_recordset(NEW.order_details) AS x(id UUID, quantity NUMERIC)
        LOOP
            -- For each menu item in the order, find all its recipe ingredients
            FOR recipe_ingredient IN 
                SELECT * FROM menu_item_ingredients
                WHERE menu_item_id = order_item.id
            LOOP
                -- Deduct the required quantity from the inventory table
                UPDATE inventory
                SET current_stock = current_stock - (recipe_ingredient.quantity * order_item.quantity)
                WHERE id = recipe_ingredient.inventory_id;
            END LOOP;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing trigger to ensure a clean setup
DROP TRIGGER IF EXISTS on_order_preparing_deduct_inventory ON orders;

-- Create the trigger that executes the function after an order is updated
CREATE TRIGGER on_order_preparing_deduct_inventory
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_prepare();


-- STORAGE: Ensure buckets 'menu-images' and 'restaurant-assets' exist and are PUBLIC.
-- REALTIME: Enable via Supabase UI Dashboard for the 'orders' table.
