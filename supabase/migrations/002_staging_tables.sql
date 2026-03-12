-- ============================================
-- Staging tables for atomic data refresh
-- Scrapers write here; finalize script promotes to production only if all jobs pass.
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Staging: flight options
CREATE TABLE flight_options_staging (
  id SERIAL PRIMARY KEY,
  date_range_id TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  category TEXT NOT NULL,
  airport_used TEXT NOT NULL,
  price DECIMAL(10,2),
  airline TEXT,
  outbound_details JSONB,
  return_details JSONB,
  google_flights_url TEXT,
  is_best BOOLEAN DEFAULT FALSE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  run_id TEXT
);

-- Staging: airbnb listings
CREATE TABLE airbnb_listings_staging (
  id SERIAL PRIMARY KEY,
  date_range_id TEXT NOT NULL,
  listing_name TEXT,
  price_per_night DECIMAL(10,2),
  price_per_person_per_night DECIMAL(10,2),
  total_stay_cost DECIMAL(10,2),
  rating DECIMAL(3,2),
  review_count INT,
  bedrooms INT,
  bathrooms INT,
  max_guests INT,
  amenities JSONB,
  image_url TEXT,
  airbnb_url TEXT,
  superhost BOOLEAN DEFAULT FALSE,
  budget_tier TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  run_id TEXT
);

-- Staging: aggregated best flights
CREATE TABLE flights_staging (
  id SERIAL PRIMARY KEY,
  date_range_id TEXT NOT NULL,
  trip_format TEXT NOT NULL,
  depart_date DATE NOT NULL,
  return_date DATE NOT NULL,
  origin_city TEXT NOT NULL,
  category TEXT NOT NULL,
  airport_used TEXT NOT NULL,
  price DECIMAL(10,2),
  airline TEXT,
  outbound_details JSONB,
  return_details JSONB,
  google_flights_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  run_id TEXT
);

CREATE INDEX idx_f_staging_run ON flights_staging(run_id);
CREATE INDEX idx_fo_staging_run ON flight_options_staging(run_id);
CREATE INDEX idx_al_staging_run ON airbnb_listings_staging(run_id);

ALTER TABLE flights_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_options_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_listings_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON flights_staging FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON flight_options_staging FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON airbnb_listings_staging FOR SELECT USING (true);
