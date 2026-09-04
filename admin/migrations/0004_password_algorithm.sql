-- Preserve deployed migration 0003 and any existing hashes. The iterations
-- column is legacy PBKDF2 metadata; scrypt costs are fixed by algorithm profile.
ALTER TABLE auth_password ADD COLUMN algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256';
