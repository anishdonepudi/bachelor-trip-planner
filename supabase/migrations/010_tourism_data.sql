-- Tourism data cache table
-- Stores LLM-generated tourism insights (crowd levels, seasons, festivals) per city
CREATE TABLE tourism_data (
  city TEXT PRIMARY KEY,              -- lowercase city name
  country_code TEXT,                  -- ISO 2-letter country code
  data JSONB NOT NULL,                -- DestinationData JSON (months, events, notes)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_used TEXT,                    -- e.g., "gemini-2.0-flash"
  source TEXT DEFAULT 'gemini'        -- 'gemini', 'static', 'manual'
);

-- Index for admin refresh queries
CREATE INDEX idx_tourism_data_generated_at ON tourism_data(generated_at);

-- Allow public read (travel insights are not sensitive)
ALTER TABLE tourism_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tourism_data" ON tourism_data FOR SELECT USING (true);
-- Writes go through service key (API routes), no user-level insert/update needed
CREATE POLICY "Service write tourism_data" ON tourism_data FOR ALL USING (true) WITH CHECK (true);
