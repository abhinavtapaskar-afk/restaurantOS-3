-- Create restaurants table if it doesn't exist
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  theme_color TEXT DEFAULT 'emerald',
  hero_image_url TEXT,
  about_us TEXT,
  address TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT,
  is_veg BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_status type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'delivered', 'cancelled');
    END IF;
END$$;

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  order_details JSONB,
  total_amount NUMERIC(10, 2) NOT NULL,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Create storage bucket for menu item images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for restaurant hero images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
-- Enable RLS for all tables (this is safe to run multiple times)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy for restaurants
DROP POLICY IF EXISTS "Restaurants are publicly viewable." ON restaurants;
DROP POLICY IF EXISTS "Owners can manage their own restaurant." ON restaurants;

CREATE POLICY "Restaurants are publicly viewable."
ON restaurants
FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their own restaurant."
ON restaurants
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);


-- Policy for menu_items
DROP POLICY IF EXISTS "Menu items are publicly viewable." ON menu_items;
DROP POLICY IF EXISTS "Owners can manage their own menu items." ON menu_items;

CREATE POLICY "Menu items are publicly viewable."
ON menu_items
FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their own menu items."
ON menu_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = menu_items.restaurant_id
  AND restaurants.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = menu_items.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Policy for orders
DROP POLICY IF EXISTS "Owners can view and manage their own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create an order" ON orders;
-- Clean up old granular policies from previous versions
DROP POLICY IF EXISTS "Owners can select their own orders" ON orders;
DROP POLICY IF EXISTS "Owners can update their own orders" ON orders;
DROP POLICY IF EXISTS "Owners can delete their own orders" ON orders;


CREATE POLICY "Owners can view and manage their own orders"
ON orders
FOR ALL
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = orders.restaurant_id
  AND restaurants.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = orders.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

CREATE POLICY "Anyone can create an order"
ON orders
FOR INSERT
WITH CHECK (true);

-- Policy for reviews
DROP POLICY IF EXISTS "Reviews are publicly viewable." ON reviews;
DROP POLICY IF EXISTS "Anyone can submit a review." ON reviews;
DROP POLICY IF EXISTS "Owners can see their reviews." ON reviews;

CREATE POLICY "Reviews are publicly viewable."
ON reviews
FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit a review."
ON reviews
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can see their reviews."
ON reviews
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = reviews.restaurant_id
  AND restaurants.owner_id = auth.uid()
));


-- Policies for storage (Drop and recreate to be idempotent)
DROP POLICY IF EXISTS "Menu images are publicly accessible." ON storage.objects;
CREATE POLICY "Menu images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

DROP POLICY IF EXISTS "Restaurant assets are publicly accessible." ON storage.objects;
CREATE POLICY "Restaurant assets are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'restaurant-assets' );

DROP POLICY IF EXISTS "Owners can upload menu images." ON storage.objects;
CREATE POLICY "Owners can upload menu images."
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Owners can upload restaurant assets." ON storage.objects;
CREATE POLICY "Owners can upload restaurant assets."
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'restaurant-assets' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Owners can update their media." ON storage.objects;
CREATE POLICY "Owners can update their media."
ON storage.objects FOR UPDATE
USING ( auth.uid() = owner AND (bucket_id = 'menu-images' OR bucket_id = 'restaurant-assets') );

DROP POLICY IF EXISTS "Owners can delete their media." ON storage.objects;
CREATE POLICY "Owners can delete their media."
ON storage.objects FOR DELETE
USING ( auth.uid() = owner AND (bucket_id = 'menu-images' OR bucket_id = 'restaurant-assets') );