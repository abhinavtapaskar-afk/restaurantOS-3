
-- RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT 'Nanded',
  slug TEXT UNIQUE NOT NULL,
  theme_color TEXT DEFAULT 'emerald',
  font TEXT DEFAULT 'Inter',
  hero_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_us TEXT,
  address TEXT,
  phone_number TEXT,
  opening_hours TEXT,
  google_maps_url TEXT,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
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
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'COD',
  order_type TEXT DEFAULT 'DELIVERY',
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

-- Everyone can view restaurants and menu items
CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);

-- Owners can manage their own restaurant and menu
CREATE POLICY "Owners manage restaurants" ON restaurants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Owners manage menu" ON menu_items FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Orders: Customers can insert, Owners can read/update
CREATE POLICY "Customers place orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers track own order" ON orders FOR SELECT USING (true); -- Usually filtered by ID in app
CREATE POLICY "Owners manage orders" ON orders FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- REALTIME: Remember to enable via Supabase UI Dashboard:
-- Database -> Replication -> Enable for 'orders' table.

-- STORAGE: Ensure buckets 'menu-images' and 'restaurant-assets' exist and are PUBLIC.