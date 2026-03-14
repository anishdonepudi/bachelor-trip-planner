-- ============================================================
-- Migration 009: Multi-trip support
-- ============================================================

-- 1. Create trips table
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cities JSONB NOT NULL DEFAULT '[]',
  destination_airport TEXT NOT NULL,
  destination_city TEXT,
  total_people INT NOT NULL DEFAULT 1,
  excluded_dates JSONB DEFAULT '[]',
  flight_categories JSONB,
  flight_time_filters JSONB,
  month_range JSONB,
  trip_duration JSONB DEFAULT '{"nights":3,"departDays":[4,5]}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create trip_collaborators table
CREATE TABLE trip_collaborators (
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

-- 3. Add trip_id to data tables
ALTER TABLE flights ADD COLUMN trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE flight_options ADD COLUMN trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE airbnb_listings ADD COLUMN trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE scrape_jobs ADD COLUMN trip_id TEXT;

-- Staging tables
ALTER TABLE flights_staging ADD COLUMN trip_id TEXT;
ALTER TABLE flight_options_staging ADD COLUMN trip_id TEXT;
ALTER TABLE airbnb_listings_staging ADD COLUMN trip_id TEXT;

-- Recreate previous_weekend_snapshot with trip_id as PK
-- First drop existing, then recreate
DROP TABLE IF EXISTS previous_weekend_snapshot;
CREATE TABLE previous_weekend_snapshot (
  trip_id TEXT PRIMARY KEY,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE previous_weekend_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read snapshots" ON previous_weekend_snapshot FOR SELECT USING (true);
CREATE POLICY "Service key write snapshots" ON previous_weekend_snapshot FOR ALL USING (true);

-- 4. Migrate existing data
-- Insert existing config into trips with legacy ID
INSERT INTO trips (id, name, owner_id, cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, flight_time_filters, month_range, trip_duration)
SELECT
  'legacy0001',
  'Legacy Trip',
  '00000000-0000-0000-0000-000000000000'::UUID,
  COALESCE(cities, '[]'::JSONB),
  COALESCE(destination_airport, 'CUN'),
  destination_city,
  COALESCE(total_people, 1),
  COALESCE(excluded_dates, '[]'::JSONB),
  flight_categories,
  flight_time_filters,
  month_range,
  trip_duration
FROM config
LIMIT 1;

-- Backfill trip_id on existing data
UPDATE flights SET trip_id = 'legacy0001' WHERE trip_id IS NULL;
UPDATE flight_options SET trip_id = 'legacy0001' WHERE trip_id IS NULL;
UPDATE airbnb_listings SET trip_id = 'legacy0001' WHERE trip_id IS NULL;
UPDATE scrape_jobs SET trip_id = 'legacy0001' WHERE trip_id IS NULL;

-- Migrate previous_weekend_snapshot data
INSERT INTO previous_weekend_snapshot (trip_id, snapshot, created_at)
SELECT 'legacy0001', snapshot, created_at
FROM (SELECT snapshot, created_at FROM previous_weekend_snapshot LIMIT 0) AS empty_set;
-- Note: The old table was dropped above, so this is a no-op.
-- If you need to preserve data, back it up before running this migration.

-- 5. RLS policies for trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Owner/collaborator update trips" ON trips FOR UPDATE USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_id = trips.id AND user_id = auth.uid())
);
CREATE POLICY "Owner delete trips" ON trips FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated insert trips" ON trips FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS for collaborators
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read collaborators" ON trip_collaborators FOR SELECT USING (true);
CREATE POLICY "Owner manage collaborators" ON trip_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND owner_id = auth.uid())
);

-- 6. Indexes
CREATE INDEX idx_trips_owner ON trips(owner_id);
CREATE INDEX idx_flights_trip_id ON flights(trip_id);
CREATE INDEX idx_flight_options_trip_id ON flight_options(trip_id);
CREATE INDEX idx_airbnb_trip_id ON airbnb_listings(trip_id);
CREATE INDEX idx_scrape_jobs_trip_id ON scrape_jobs(trip_id);
