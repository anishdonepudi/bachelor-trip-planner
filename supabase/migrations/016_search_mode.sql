-- Add search_mode column to trips table
ALTER TABLE trips ADD COLUMN search_mode text NOT NULL DEFAULT 'both'
  CHECK (search_mode IN ('flights', 'stays', 'both'));
