-- Authentication is separate from private records and never included in exports.
CREATE TABLE auth_admin (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  user_handle TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE auth_credentials (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'primary' REFERENCES auth_admin(id),
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  credential_id TEXT REFERENCES auth_credentials(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'recovery')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_challenges (
  token_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'setup', 'register', 'recover')),
  challenge TEXT NOT NULL,
  user_handle TEXT NOT NULL,
  session_hash TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_challenges_expiry ON auth_challenges(expires_at);
CREATE TABLE auth_recovery_codes (
  code_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE auth_rate_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_rate_expiry ON auth_rate_limits(expires_at);
-- A transaction must abort, not silently continue, if its session was revoked.
CREATE TABLE auth_write_guard (id INTEGER PRIMARY KEY CHECK (id = 1), allowed INTEGER NOT NULL CHECK (allowed = 1));
PRAGMA optimize;
