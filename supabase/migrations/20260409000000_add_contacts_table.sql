-- Contacts table: collects email addresses independently from survey responses
-- Used for follow-up hearing requests and future update notifications
CREATE TABLE contacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert only
CREATE POLICY "anon_insert_contacts" ON contacts
  FOR INSERT TO anon WITH CHECK (true);

-- Service role can read all
CREATE POLICY "service_read_contacts" ON contacts
  FOR SELECT TO service_role USING (true);
