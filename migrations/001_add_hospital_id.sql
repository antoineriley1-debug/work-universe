-- Migration: Add hospital_id to ingested_emails table
-- This migration adds support for associating ingested emails with hospitals

-- Check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS ingested_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT,
  hospital_id UUID,
  subject TEXT,
  from_address TEXT,
  summary TEXT,
  body TEXT,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add hospital_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingested_emails' AND column_name = 'hospital_id'
  ) THEN
    ALTER TABLE ingested_emails ADD COLUMN hospital_id UUID;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ingested_emails_hospital_id ON ingested_emails(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ingested_emails_email_id ON ingested_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_ingested_emails_saved_at ON ingested_emails(saved_at DESC);

-- Enable RLS for security
ALTER TABLE ingested_emails ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for the app to save emails)
DROP POLICY IF EXISTS "Allow public inserts" ON ingested_emails;
CREATE POLICY "Allow public inserts" ON ingested_emails
  FOR INSERT WITH CHECK (true);

-- Allow public reads (for the app to display emails)
DROP POLICY IF EXISTS "Allow public reads" ON ingested_emails;
CREATE POLICY "Allow public reads" ON ingested_emails
  FOR SELECT USING (true);

-- Allow public updates (for updating hospital associations)
DROP POLICY IF EXISTS "Allow public updates" ON ingested_emails;
CREATE POLICY "Allow public updates" ON ingested_emails
  FOR UPDATE WITH CHECK (true);
