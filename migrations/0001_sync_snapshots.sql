CREATE TABLE IF NOT EXISTS sync_snapshots (
  owner TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  checksum TEXT NOT NULL
);

PRAGMA optimize;
