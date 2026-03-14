-- ============================================
-- Single-row table to store the previous weekend data snapshot.
-- Used as a DB fallback for rank change indicators when localStorage
-- is stale or unavailable (first visit, cleared cache, different browser).
-- Run this in the Supabase SQL Editor.
-- ============================================

CREATE TABLE IF NOT EXISTS previous_weekend_snapshot (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: allow anonymous read
ALTER TABLE previous_weekend_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON previous_weekend_snapshot
  FOR SELECT TO anon USING (true);
