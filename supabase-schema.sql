-- ============================================================
-- 市民意識調査 Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Main responses table (one row per survey submission)
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  interest_level INTEGER CHECK (interest_level BETWEEN 1 AND 5),

  -- Q1-Q6 Likert responses
  q1_likert TEXT CHECK (q1_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q1_freetext TEXT DEFAULT '',
  q2_likert TEXT CHECK (q2_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q2_freetext TEXT DEFAULT '',
  q3_likert TEXT CHECK (q3_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q3_freetext TEXT DEFAULT '',
  q4_likert TEXT CHECK (q4_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q4_freetext TEXT DEFAULT '',
  q5_likert TEXT CHECK (q5_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q5_freetext TEXT DEFAULT '',
  q6_likert TEXT CHECK (q6_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q6_freetext TEXT DEFAULT '',

  -- Q7-Q10 AI-generated follow-up questions and responses
  q7_text TEXT DEFAULT '',
  q7_likert TEXT CHECK (q7_likert IS NULL OR q7_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q8_text TEXT DEFAULT '',
  q8_likert TEXT CHECK (q8_likert IS NULL OR q8_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q9_text TEXT DEFAULT '',
  q9_likert TEXT CHECK (q9_likert IS NULL OR q9_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),
  q10_text TEXT DEFAULT '',
  q10_likert TEXT CHECK (q10_likert IS NULL OR q10_likert IN ('strongly_agree','agree','neutral','disagree','strongly_disagree','dont_know')),

  -- Final free text
  additional_comments TEXT DEFAULT '',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_agent TEXT DEFAULT '',
  page_completed INTEGER DEFAULT 0 CHECK (page_completed BETWEEN 0 AND 2)
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_completed ON responses(completed_at);

-- Row Level Security
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (anonymous survey)
CREATE POLICY "Anyone can insert responses" ON responses
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update their own response (by session_id match)
CREATE POLICY "Anyone can update own response" ON responses
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy: Only service role can read all (for admin dashboard)
-- The anon key cannot read responses directly; admin API uses service role
CREATE POLICY "Service role can read all" ON responses
  FOR SELECT USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- LLM response cache table
-- ============================================================
CREATE TABLE IF NOT EXISTS llm_cache (
  cache_key TEXT PRIMARY KEY,
  request_body JSONB NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries (e.g. delete old entries)
CREATE INDEX IF NOT EXISTS idx_llm_cache_created_at ON llm_cache(created_at);

-- RLS: Only service role can access cache
ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to llm_cache" ON llm_cache
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
