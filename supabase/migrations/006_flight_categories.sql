-- Add configurable flight categories and time filters to config
ALTER TABLE config ADD COLUMN IF NOT EXISTS flight_categories JSONB DEFAULT NULL;
ALTER TABLE config ADD COLUMN IF NOT EXISTS flight_time_filters JSONB DEFAULT NULL;
-- NULL means use defaults for backwards compatibility
