
-- ... [Rest of existing schema] ...

-- Update orders table to include standardized logistics columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- ... [Rest of existing policies] ...
