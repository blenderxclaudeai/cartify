
-- Add new enum values to photo_category
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'hands';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'fingers';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'nails';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'hair';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'ears';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'living_room';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'kitchen';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'bedroom';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'bathroom';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'office';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'dog';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'cat';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'car_interior';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'car_exterior';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'patio';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'garden';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'balcony';
