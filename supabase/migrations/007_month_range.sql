-- Add configurable month range for trip season
ALTER TABLE config ADD COLUMN IF NOT EXISTS month_range JSONB DEFAULT NULL;
