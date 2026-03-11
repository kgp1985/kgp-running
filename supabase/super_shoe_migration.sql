-- Add super shoe flag to shoes table
-- Super shoes (carbon plate race shoes) have a lower mileage limit (250 mi vs 500 mi)
ALTER TABLE public.shoes
  ADD COLUMN IF NOT EXISTS is_super_shoe boolean DEFAULT false;
