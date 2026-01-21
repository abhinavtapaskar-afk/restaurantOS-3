
-- ... [Rest of existing schema] ...

-- Update orders table to include logistics columns if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lat NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lng NUMERIC;

-- ... [Rest of existing policies] ...
