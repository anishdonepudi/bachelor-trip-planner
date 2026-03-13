-- ============================================
-- Persistent cache for Airbnb listing detail pages.
-- Bathrooms, guest count, and amenities rarely change, so we cache them
-- to avoid re-fetching detail pages on every scrape run.
-- Run this in the Supabase SQL Editor.
-- ============================================

CREATE TABLE listing_details_cache (
  listing_id TEXT PRIMARY KEY,
  bathrooms DECIMAL(4,1),
  max_guests INT,
  amenities JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_details_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON listing_details_cache FOR SELECT USING (true);
