CREATE TABLE private_records (
  id TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL DEFAULT 'primary' CHECK (owner = 'primary'),
  kind TEXT NOT NULL CHECK (kind IN ('plan','inbox','habit','habit-log','focus-session','focus-state','checklist','expiry','expense','inventory','journal','reminder','capture-draft')),
  data_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_private_records_owner_kind_updated
ON private_records(owner, kind, updated_at DESC);

CREATE INDEX idx_private_records_owner_deleted
ON private_records(owner, deleted_at);

CREATE TABLE import_runs (
  checksum TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  imported_count INTEGER NOT NULL,
  imported_at TEXT NOT NULL
);

PRAGMA optimize;
