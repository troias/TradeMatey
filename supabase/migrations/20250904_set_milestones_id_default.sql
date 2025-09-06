-- Migration: set default for milestones.id to gen_random_uuid()
-- Ensures milestone inserts are robust when DB schema lacks a default generator
-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Set default for milestones.id
ALTER TABLE IF EXISTS public.milestones
ALTER COLUMN id
SET DEFAULT gen_random_uuid();
-- Safety: if you prefer uuid_generate_v4() instead, replace the function above.