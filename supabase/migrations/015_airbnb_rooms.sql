-- Add room/bed filter columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS airbnb_min_bedrooms INTEGER DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS airbnb_min_bathrooms INTEGER DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS airbnb_min_beds INTEGER DEFAULT NULL;
