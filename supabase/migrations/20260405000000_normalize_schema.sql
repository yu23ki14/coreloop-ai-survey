-- ============================================================
-- スキーマ正規化: responses → sessions + answers
-- ============================================================

-- Drop old flat table
DROP TABLE IF EXISTS responses CASCADE;

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Sessions table (one row per survey respondent)
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  interest_level INTEGER CHECK (interest_level IS NULL OR interest_level BETWEEN 1 AND 5),
  interest_reasons JSONB DEFAULT '[]',
  interest_other_text TEXT DEFAULT '',
  additional_comments TEXT DEFAULT '',
  page_completed INTEGER DEFAULT 0 CHECK (page_completed BETWEEN 0 AND 2),
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_completed ON sessions(completed_at);

-- ============================================================
-- Answers table (one row per question per session)
-- ============================================================
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT DEFAULT '',
  likert TEXT CHECK (likert IS NULL OR likert IN (
    'strongly_agree', 'agree', 'neutral', 'disagree', 'strongly_disagree', 'dont_know'
  )),
  freetext TEXT DEFAULT '',
  is_followup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_answers_session_id ON answers(session_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update own session" ON sessions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all sessions" ON sessions
  FOR SELECT USING (auth.role() = 'service_role');

-- Answers
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert answers" ON answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update own answers" ON answers
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all answers" ON answers
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- LLM response cache table (unchanged)
-- ============================================================
CREATE TABLE IF NOT EXISTS llm_cache (
  cache_key TEXT PRIMARY KEY,
  request_body JSONB NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_created_at ON llm_cache(created_at);

ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to llm_cache" ON llm_cache
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
