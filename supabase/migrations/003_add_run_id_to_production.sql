-- ============================================
-- Add run_id to production tables for atomic swap
-- Instead of delete-all → insert, we insert new rows first (with run_id),
-- then delete old rows. This prevents an empty-table window.
-- Run this in the Supabase SQL Editor.
-- ============================================

-- flights: drop the UNIQUE constraint so we can have old + new rows simultaneously
ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_date_range_id_origin_city_category_key;

ALTER TABLE flights ADD COLUMN run_id TEXT;
ALTER TABLE flight_options ADD COLUMN run_id TEXT;
ALTER TABLE airbnb_listings ADD COLUMN run_id TEXT;

CREATE INDEX idx_flights_run ON flights(run_id);
CREATE INDEX idx_fo_run ON flight_options(run_id);
CREATE INDEX idx_al_run ON airbnb_listings(run_id);
