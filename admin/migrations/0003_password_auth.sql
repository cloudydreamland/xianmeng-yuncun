-- Additive migration: never touches private records or existing device keys.
CREATE TABLE auth_password (
  id TEXT PRIMARY KEY CHECK (id = 'primary') REFERENCES auth_admin(id),
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  iterations INTEGER NOT NULL CHECK (iterations = 600000),
  version INTEGER NOT NULL CHECK (version > 0),
  updated_at INTEGER NOT NULL
);
ALTER TABLE auth_sessions ADD COLUMN password_version INTEGER;
