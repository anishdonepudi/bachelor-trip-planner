-- Add trip_duration JSONB column to config table
-- Stores { nights: number, departDays: number[] }
ALTER TABLE config ADD COLUMN IF NOT EXISTS trip_duration jsonb DEFAULT '{"nights": 3, "departDays": [4, 5]}'::jsonb;
