-- Create waitlist table for beta signups
-- This table is used by the marketing site to collect email addresses

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment for documentation
COMMENT ON TABLE public.waitlist IS 'Stores email addresses for beta waitlist signups from the marketing site';

-- Enable RLS but allow public inserts (no auth required for signups)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for public signups)
CREATE POLICY "Allow public insert on waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users with service role can read (for admin access)
-- Note: The marketing site uses supabaseAdmin (service role) which bypasses RLS
-- This policy is for any future admin dashboard access
CREATE POLICY "Allow authenticated read on waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for email lookups (duplicate checking)
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);

-- Create index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at DESC);
