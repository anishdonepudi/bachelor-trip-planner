-- Add configurable flight categories to config
ALTER TABLE config ADD COLUMN IF NOT EXISTS flight_categories JSONB DEFAULT NULL;
-- NULL means use default categories for backwards compatibility
