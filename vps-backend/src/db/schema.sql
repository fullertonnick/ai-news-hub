-- LinkedIn automation database schema

CREATE TABLE IF NOT EXISTS linkedin_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  cookies TEXT NOT NULL,         -- JSON: encrypted li_at + JSESSIONID
  user_agent TEXT,
  status TEXT DEFAULT 'active',  -- 'active' | 'expired' | 'blocked'
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS linkedin_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',  -- 'active' | 'paused' | 'completed' | 'draft'
  search_url TEXT,               -- LinkedIn search URL for finding targets
  sequence TEXT NOT NULL,        -- JSON: array of {action, delay_hours, template, condition}
  daily_limit INTEGER DEFAULT 25,
  working_hours_start INTEGER DEFAULT 9,   -- 24h format
  working_hours_end INTEGER DEFAULT 18,
  timezone TEXT DEFAULT 'America/Chicago',
  stats TEXT DEFAULT '{}',       -- JSON: {sent, accepted, replied, etc.}
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS linkedin_prospects (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES linkedin_campaigns(id) ON DELETE CASCADE,
  profile_url TEXT NOT NULL,
  name TEXT,
  headline TEXT,
  company TEXT,
  location TEXT,
  connection_degree TEXT,        -- '1st' | '2nd' | '3rd' | 'Out of Network'
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'viewed' | 'connected' | 'messaged' | 'replied' | 'skipped' | 'error'
  next_action_at TEXT,
  last_action_at TEXT,
  error_message TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS linkedin_actions_log (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES linkedin_campaigns(id),
  prospect_id TEXT REFERENCES linkedin_prospects(id),
  action_type TEXT NOT NULL,     -- 'view_profile' | 'connect' | 'message' | 'inmail' | 'follow' | 'endorse' | 'like'
  message_text TEXT,             -- the actual message sent (if applicable)
  status TEXT DEFAULT 'completed', -- 'completed' | 'failed' | 'skipped'
  error TEXT,
  executed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_limits_tracker (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,            -- YYYY-MM-DD
  connections_sent INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  inmails_sent INTEGER DEFAULT 0,
  profiles_viewed INTEGER DEFAULT 0,
  endorsements INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON linkedin_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON linkedin_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_action ON linkedin_prospects(next_action_at);
CREATE INDEX IF NOT EXISTS idx_actions_log_campaign ON linkedin_actions_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_actions_log_date ON linkedin_actions_log(executed_at);
