-- Add mileage_offset to shoes table
-- This allows users to manually account for miles worn before tracking started.
-- The displayed mileage = mileage_offset + miles calculated from tagged runs.

alter table public.shoes
add column if not exists mileage_offset numeric default 0;
