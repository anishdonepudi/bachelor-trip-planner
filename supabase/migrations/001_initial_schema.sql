-- ============================================
-- Bachelor Trip Planner - Initial Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Group configuration
CREATE TABLE config (
  id SERIAL PRIMARY KEY,
  cities JSONB NOT NULL DEFAULT '[]',
  destination_airport TEXT DEFAULT 'CUN',
  total_people INT DEFAULT 17,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flight data (one row per city x date range x category — the BEST option)
CREATE TABLE flights (
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
  UNIQUE(date_range_id, origin_city, category)
);

-- All flight options scraped (not just the best)
CREATE TABLE flight_options (
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
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Airbnb listings
CREATE TABLE airbnb_listings (
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
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape job tracking
CREATE TABLE scrape_jobs (
  id SERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  github_run_id TEXT
);

-- Indexes
CREATE INDEX idx_flights_date_range ON flights(date_range_id);
CREATE INDEX idx_flights_city ON flights(origin_city);
CREATE INDEX idx_flight_options_date_range ON flight_options(date_range_id);
CREATE INDEX idx_airbnb_date_range ON airbnb_listings(date_range_id);
CREATE INDEX idx_airbnb_tier ON airbnb_listings(budget_tier);

-- Row Level Security (read-only for anon key)
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON flights FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON flight_options FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON airbnb_listings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON config FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON scrape_jobs FOR SELECT USING (true);
