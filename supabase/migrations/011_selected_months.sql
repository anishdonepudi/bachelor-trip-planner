-- Add selected_months column to trips table (array of {month, year} objects)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS selected_months JSONB DEFAULT NULL;

-- Also add to legacy config table if it exists
ALTER TABLE config ADD COLUMN IF NOT EXISTS selected_months JSONB DEFAULT NULL;
