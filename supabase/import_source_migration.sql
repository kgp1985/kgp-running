-- Track how runs were added (manual, fit, gpx, tcx, strava, import)
ALTER TABLE runs ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
