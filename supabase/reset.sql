-- =============================================================================
-- FULL DATABASE RESET SCRIPT
-- =============================================================================
-- This script drops all tables and recreates the complete schema from scratch.
-- It represents the final state after all 16 migrations have been applied.
--
-- Usage: Run this against a Supabase database to reset it to a clean state.
-- WARNING: This will destroy all existing data.
-- =============================================================================


-- =============================================================================
-- SECTION 1: DROP ALL TABLES (in FK-safe order, with CASCADE)
-- =============================================================================

DROP TABLE IF EXISTS trip_collaborators CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS flight_options CASCADE;
DROP TABLE IF EXISTS airbnb_listings CASCADE;
DROP TABLE IF EXISTS scrape_jobs CASCADE;
DROP TABLE IF EXISTS flights_staging CASCADE;
DROP TABLE IF EXISTS flight_options_staging CASCADE;
DROP TABLE IF EXISTS airbnb_listings_staging CASCADE;
DROP TABLE IF EXISTS previous_weekend_snapshot CASCADE;
DROP TABLE IF EXISTS listing_details_cache CASCADE;
DROP TABLE IF EXISTS tourism_data CASCADE;
DROP TABLE IF EXISTS city_selections CASCADE;
DROP TABLE IF EXISTS popular_cities CASCADE;
DROP TABLE IF EXISTS trips CASCADE;


-- =============================================================================
-- SECTION 2: CREATE ALL TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
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
  trip_duration JSONB DEFAULT NULL,
  selected_months JSONB DEFAULT NULL,
  budget_tiers JSONB DEFAULT NULL,
  airbnb_amenities JSONB DEFAULT NULL,
  airbnb_min_bedrooms INTEGER DEFAULT NULL,
  airbnb_min_bathrooms INTEGER DEFAULT NULL,
  airbnb_min_beds INTEGER DEFAULT NULL,
  search_mode TEXT NOT NULL DEFAULT 'both' CHECK (search_mode IN ('flights', 'stays', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- trip_collaborators
-- -----------------------------------------------------------------------------
CREATE TABLE trip_collaborators (
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

-- -----------------------------------------------------------------------------
-- flights (no unique constraint)
-- -----------------------------------------------------------------------------
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
  run_id TEXT,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- flight_options
-- -----------------------------------------------------------------------------
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
  run_id TEXT,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- airbnb_listings
-- -----------------------------------------------------------------------------
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
  run_id TEXT,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- scrape_jobs
-- -----------------------------------------------------------------------------
CREATE TABLE scrape_jobs (
  id SERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  github_run_id TEXT,
  trip_id TEXT
);

-- -----------------------------------------------------------------------------
-- staging tables
-- -----------------------------------------------------------------------------
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
  run_id TEXT,
  trip_id TEXT
);

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
  run_id TEXT,
  trip_id TEXT
);

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
  run_id TEXT,
  trip_id TEXT
);

-- -----------------------------------------------------------------------------
-- listing_details_cache
-- -----------------------------------------------------------------------------
CREATE TABLE listing_details_cache (
  listing_id TEXT PRIMARY KEY,
  bathrooms DECIMAL(4,1),
  max_guests INT,
  amenities JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- previous_weekend_snapshot
-- -----------------------------------------------------------------------------
CREATE TABLE previous_weekend_snapshot (
  trip_id TEXT PRIMARY KEY,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- tourism_data
-- -----------------------------------------------------------------------------
CREATE TABLE tourism_data (
  city TEXT PRIMARY KEY,
  country_code TEXT,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_used TEXT,
  source TEXT DEFAULT 'gemini'
);

-- -----------------------------------------------------------------------------
-- city_selections
-- -----------------------------------------------------------------------------
CREATE TABLE city_selections (
  id SERIAL PRIMARY KEY,
  city_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  state TEXT,
  country TEXT,
  population INT,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- popular_cities
-- -----------------------------------------------------------------------------
CREATE TABLE popular_cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  population INT NOT NULL DEFAULT 0,
  popularity_score INT NOT NULL DEFAULT 0,
  selection_count_30d INT NOT NULL DEFAULT 0,
  selection_count_all INT NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'dynamic',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, country_code)
);


-- =============================================================================
-- SECTION 3: INDEXES
-- =============================================================================

-- trips
CREATE INDEX idx_trips_owner ON trips(owner_id);

-- flights
CREATE INDEX idx_flights_date_range ON flights(date_range_id);
CREATE INDEX idx_flights_city ON flights(origin_city);
CREATE INDEX idx_flights_run ON flights(run_id);
CREATE INDEX idx_flights_trip_id ON flights(trip_id);

-- flight_options
CREATE INDEX idx_flight_options_date_range ON flight_options(date_range_id);
CREATE INDEX idx_fo_run ON flight_options(run_id);
CREATE INDEX idx_flight_options_trip_id ON flight_options(trip_id);

-- airbnb_listings
CREATE INDEX idx_airbnb_date_range ON airbnb_listings(date_range_id);
CREATE INDEX idx_airbnb_tier ON airbnb_listings(budget_tier);
CREATE INDEX idx_al_run ON airbnb_listings(run_id);
CREATE INDEX idx_airbnb_trip_id ON airbnb_listings(trip_id);

-- scrape_jobs
CREATE INDEX idx_scrape_jobs_trip_id ON scrape_jobs(trip_id);

-- staging tables
CREATE INDEX idx_f_staging_run ON flights_staging(run_id);
CREATE INDEX idx_fo_staging_run ON flight_options_staging(run_id);
CREATE INDEX idx_al_staging_run ON airbnb_listings_staging(run_id);

-- tourism_data
CREATE INDEX idx_tourism_data_generated_at ON tourism_data(generated_at);

-- city_selections
CREATE INDEX idx_city_selections_city ON city_selections(city_name, country_code);
CREATE INDEX idx_city_selections_date ON city_selections(selected_at);

-- popular_cities
CREATE INDEX idx_popular_cities_score ON popular_cities(popularity_score DESC);
CREATE INDEX idx_popular_cities_name ON popular_cities(name);


-- =============================================================================
-- SECTION 4: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Owner/collaborator update trips" ON trips FOR UPDATE USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_id = trips.id AND user_id = auth.uid())
);
CREATE POLICY "Owner delete trips" ON trips FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated insert trips" ON trips FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- trip_collaborators
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read collaborators" ON trip_collaborators FOR SELECT USING (true);
CREATE POLICY "Owner manage collaborators" ON trip_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND owner_id = auth.uid())
);

-- flights
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON flights FOR SELECT USING (true);

-- flight_options
ALTER TABLE flight_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON flight_options FOR SELECT USING (true);

-- airbnb_listings
ALTER TABLE airbnb_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON airbnb_listings FOR SELECT USING (true);

-- scrape_jobs
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON scrape_jobs FOR SELECT USING (true);

-- staging tables
ALTER TABLE flights_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_options_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_listings_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON flights_staging FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON flight_options_staging FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON airbnb_listings_staging FOR SELECT USING (true);

-- listing_details_cache
ALTER TABLE listing_details_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON listing_details_cache FOR SELECT USING (true);

-- previous_weekend_snapshot
ALTER TABLE previous_weekend_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read snapshots" ON previous_weekend_snapshot FOR SELECT USING (true);
CREATE POLICY "Service key write snapshots" ON previous_weekend_snapshot FOR ALL USING (true);

-- tourism_data
ALTER TABLE tourism_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tourism_data" ON tourism_data FOR SELECT USING (true);
CREATE POLICY "Service write tourism_data" ON tourism_data FOR ALL USING (true) WITH CHECK (true);

-- city_selections
ALTER TABLE city_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service write city_selections" ON city_selections FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- popular_cities
ALTER TABLE popular_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read popular_cities" ON popular_cities FOR SELECT USING (true);
CREATE POLICY "Service insert popular_cities" ON popular_cities FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update popular_cities" ON popular_cities FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete popular_cities" ON popular_cities FOR DELETE USING (auth.role() = 'service_role');


-- =============================================================================
-- SECTION 5: SEED DATA
-- =============================================================================

INSERT INTO popular_cities (name, state, country, country_code, lat, lng, population, popularity_score, source, pinned) VALUES
  ('San Francisco', 'California', 'United States', 'US', 37.7749, -122.4194, 873965, 100, 'seed', false),
  ('New York City', 'New York', 'United States', 'US', 40.7128, -74.006, 8336817, 100, 'seed', false),
  ('Philadelphia', 'Pennsylvania', 'United States', 'US', 39.9526, -75.1652, 1603797, 100, 'seed', false),
  ('Houston', 'Texas', 'United States', 'US', 29.7604, -95.3698, 2304580, 100, 'seed', false),
  ('New Orleans', 'Louisiana', 'United States', 'US', 29.9511, -90.0715, 383997, 100, 'seed', false),
  ('Washington DC', 'District of Columbia', 'United States', 'US', 38.9072, -77.0369, 689545, 100, 'seed', false),
  ('Chicago', 'Illinois', 'United States', 'US', 41.8781, -87.6298, 2693976, 100, 'seed', false),
  ('Los Angeles', 'California', 'United States', 'US', 34.0522, -118.2437, 3898747, 100, 'seed', false),
  ('Phoenix', 'Arizona', 'United States', 'US', 33.4484, -112.074, 1608139, 100, 'seed', false),
  ('Irvine', 'California', 'United States', 'US', 33.6846, -117.8265, 307670, 100, 'seed', false),
  ('Atlanta', 'Georgia', 'United States', 'US', 33.749, -84.388, 498715, 100, 'seed', false),
  ('Miami', 'Florida', 'United States', 'US', 25.7617, -80.1918, 442241, 100, 'seed', false),
  ('Tampa', 'Florida', 'United States', 'US', 27.9506, -82.4572, 384959, 100, 'seed', false),
  ('Orlando', 'Florida', 'United States', 'US', 28.5383, -81.3792, 307573, 100, 'seed', false),
  ('Jacksonville', 'Florida', 'United States', 'US', 30.3322, -81.6557, 949611, 100, 'seed', false),
  ('Charlotte', 'North Carolina', 'United States', 'US', 35.2271, -80.8431, 874579, 100, 'seed', false),
  ('Raleigh', 'North Carolina', 'United States', 'US', 35.7796, -78.6382, 467665, 100, 'seed', false),
  ('Nashville', 'Tennessee', 'United States', 'US', 36.1627, -86.7816, 689447, 100, 'seed', false),
  ('Memphis', 'Tennessee', 'United States', 'US', 35.1495, -90.049, 633104, 100, 'seed', false),
  ('Richmond', 'Virginia', 'United States', 'US', 37.5407, -77.436, 226610, 100, 'seed', false),
  ('Fort Lauderdale', 'Florida', 'United States', 'US', 26.1224, -80.1373, 182760, 100, 'seed', false),
  ('Boston', 'Massachusetts', 'United States', 'US', 42.3601, -71.0589, 675647, 100, 'seed', false),
  ('Baltimore', 'Maryland', 'United States', 'US', 39.2904, -76.6122, 585708, 100, 'seed', false),
  ('Pittsburgh', 'Pennsylvania', 'United States', 'US', 40.4406, -79.9959, 302971, 100, 'seed', false),
  ('Hartford', 'Connecticut', 'United States', 'US', 41.7658, -72.6734, 121054, 100, 'seed', false),
  ('Buffalo', 'New York', 'United States', 'US', 42.8864, -78.8784, 278349, 100, 'seed', false),
  ('Providence', 'Rhode Island', 'United States', 'US', 41.824, -71.4128, 190934, 100, 'seed', false),
  ('Dallas', 'Texas', 'United States', 'US', 32.7767, -96.797, 1304379, 100, 'seed', false),
  ('Austin', 'Texas', 'United States', 'US', 30.2672, -97.7431, 978908, 100, 'seed', false),
  ('San Antonio', 'Texas', 'United States', 'US', 29.4241, -98.4936, 1434625, 100, 'seed', false),
  ('Fort Worth', 'Texas', 'United States', 'US', 32.7555, -97.3308, 918915, 100, 'seed', false),
  ('El Paso', 'Texas', 'United States', 'US', 31.7619, -106.485, 681728, 100, 'seed', false),
  ('Minneapolis', 'Minnesota', 'United States', 'US', 44.9778, -93.265, 429954, 100, 'seed', false),
  ('Detroit', 'Michigan', 'United States', 'US', 42.3314, -83.0458, 639111, 100, 'seed', false),
  ('Indianapolis', 'Indiana', 'United States', 'US', 39.7684, -86.1581, 887642, 100, 'seed', false),
  ('Columbus', 'Ohio', 'United States', 'US', 39.9612, -82.9988, 905748, 100, 'seed', false),
  ('Cincinnati', 'Ohio', 'United States', 'US', 39.1031, -84.512, 309317, 100, 'seed', false),
  ('St Louis', 'Missouri', 'United States', 'US', 38.627, -90.1994, 301578, 100, 'seed', false),
  ('Kansas City', 'Missouri', 'United States', 'US', 39.0997, -94.5786, 508090, 100, 'seed', false),
  ('Milwaukee', 'Wisconsin', 'United States', 'US', 43.0389, -87.9065, 577222, 100, 'seed', false),
  ('Cleveland', 'Ohio', 'United States', 'US', 41.4993, -81.6944, 372624, 100, 'seed', false),
  ('Louisville', 'Kentucky', 'United States', 'US', 38.2527, -85.7585, 633045, 100, 'seed', false),
  ('Oklahoma City', 'Oklahoma', 'United States', 'US', 35.4676, -97.5164, 681054, 100, 'seed', false),
  ('Omaha', 'Nebraska', 'United States', 'US', 41.2565, -95.9345, 486051, 100, 'seed', false),
  ('Seattle', 'Washington', 'United States', 'US', 47.6062, -122.3321, 737015, 100, 'seed', false),
  ('Denver', 'Colorado', 'United States', 'US', 39.7392, -104.9903, 715522, 100, 'seed', false),
  ('Portland', 'Oregon', 'United States', 'US', 45.5152, -122.6784, 652503, 100, 'seed', false),
  ('Las Vegas', 'Nevada', 'United States', 'US', 36.1699, -115.1398, 641903, 100, 'seed', false),
  ('Salt Lake City', 'Utah', 'United States', 'US', 40.7608, -111.891, 199723, 100, 'seed', false),
  ('San Diego', 'California', 'United States', 'US', 32.7157, -117.1611, 1386932, 100, 'seed', false),
  ('Sacramento', 'California', 'United States', 'US', 38.5816, -121.4944, 524943, 100, 'seed', false),
  ('San Jose', 'California', 'United States', 'US', 37.3382, -121.8863, 1013240, 100, 'seed', false),
  ('Tucson', 'Arizona', 'United States', 'US', 32.2226, -110.9747, 542629, 100, 'seed', false),
  ('Albuquerque', 'New Mexico', 'United States', 'US', 35.0844, -106.6504, 564559, 100, 'seed', false),
  ('Boise', 'Idaho', 'United States', 'US', 43.615, -116.2023, 235684, 100, 'seed', false),
  ('Colorado Springs', 'Colorado', 'United States', 'US', 38.8339, -104.8214, 478961, 100, 'seed', false),
  ('Oakland', 'California', 'United States', 'US', 37.8044, -122.2712, 433031, 100, 'seed', false),
  ('Ontario', 'California', 'United States', 'US', 34.0633, -117.6509, 175265, 100, 'seed', false),
  ('Honolulu', 'Hawaii', 'United States', 'US', 21.3069, -157.8583, 350964, 100, 'seed', false),
  ('Anchorage', 'Alaska', 'United States', 'US', 61.2181, -149.9003, 291247, 100, 'seed', false),
  ('London', NULL, 'United Kingdom', 'GB', 51.5074, -0.1278, 8982000, 100, 'seed', false),
  ('Paris', NULL, 'France', 'FR', 48.8566, 2.3522, 2161000, 100, 'seed', false),
  ('Tokyo', NULL, 'Japan', 'JP', 35.6762, 139.6503, 13960000, 100, 'seed', false),
  ('Dubai', NULL, 'United Arab Emirates', 'AE', 25.2048, 55.2708, 3331000, 100, 'seed', false),
  ('Sydney', NULL, 'Australia', 'AU', -33.8688, 151.2093, 5312000, 100, 'seed', false),
  ('Toronto', 'Ontario', 'Canada', 'CA', 43.6532, -79.3832, 2794000, 100, 'seed', false),
  ('Mexico City', NULL, 'Mexico', 'MX', 19.4326, -99.1332, 9209944, 100, 'seed', false),
  ('Berlin', NULL, 'Germany', 'DE', 52.52, 13.405, 3645000, 100, 'seed', false),
  ('Rome', NULL, 'Italy', 'IT', 41.9028, 12.4964, 2873000, 100, 'seed', false),
  ('Barcelona', NULL, 'Spain', 'ES', 41.3874, 2.1686, 1620000, 100, 'seed', false),
  ('Amsterdam', NULL, 'Netherlands', 'NL', 52.3676, 4.9041, 872680, 100, 'seed', false),
  ('Singapore', NULL, 'Singapore', 'SG', 1.3521, 103.8198, 5686000, 100, 'seed', false),
  ('Hong Kong', NULL, 'China', 'HK', 22.3193, 114.1694, 7482000, 100, 'seed', false),
  ('Seoul', NULL, 'South Korea', 'KR', 37.5665, 126.978, 9776000, 100, 'seed', false),
  ('Bangkok', NULL, 'Thailand', 'TH', 13.7563, 100.5018, 10539000, 100, 'seed', false),
  ('Istanbul', NULL, 'Turkey', 'TR', 41.0082, 28.9784, 15462000, 100, 'seed', false),
  ('Mumbai', NULL, 'India', 'IN', 19.076, 72.8777, 20411000, 100, 'seed', false),
  ('Sao Paulo', NULL, 'Brazil', 'BR', -23.5505, -46.6333, 12325000, 100, 'seed', false),
  ('Cairo', NULL, 'Egypt', 'EG', 30.0444, 31.2357, 10230000, 100, 'seed', false),
  ('Lisbon', NULL, 'Portugal', 'PT', 38.7223, -9.1393, 544851, 100, 'seed', false),
  ('Vancouver', 'British Columbia', 'Canada', 'CA', 49.2827, -123.1207, 662248, 100, 'seed', false),
  ('Cancun', NULL, 'Mexico', 'MX', 21.1619, -86.8515, 888797, 100, 'seed', false);
