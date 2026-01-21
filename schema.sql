
-- Create restaurants table
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE menu_items (
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

-- Create orders table
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'delivered', 'cancelled');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT,
  total_amount NUMERIC(10, 2) NOT NULL,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
-- Enable RLS for all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy for restaurants
CREATE POLICY "Owners can view and manage their own restaurant"
ON restaurants
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy for menu_items
CREATE POLICY "Owners can view and manage their own menu items"
ON menu_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = menu_items.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Policy for orders
CREATE POLICY "Owners can view and manage their own orders"
ON orders
FOR ALL
USING (EXISTS (
  SELECT 1 FROM restaurants
  WHERE restaurants.id = orders.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- Policies for storage
CREATE POLICY "Menu images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

CREATE POLICY "Owners can upload menu images."
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Owners can update their menu images."
ON storage.objects FOR UPDATE
USING ( auth.uid() = owner_id AND bucket_id = 'menu-images' );

CREATE POLICY "Owners can delete their menu images."
ON storage.objects FOR DELETE
USING ( auth.uid() = owner_id AND bucket_id = 'menu-images' );
