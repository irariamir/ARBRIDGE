-- Draft PostgreSQL schema for future persistence; the prototype API does not connect to it yet.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS telegram_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE,
  chat_id bigint NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pairing_tokens (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_url text,
  source_kind text NOT NULL CHECK (source_kind IN ('browser_url','telegram_upload','manual')),
  object_key text NOT NULL,
  media_type text,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  processing_status text NOT NULL CHECK (processing_status IN ('queued','processing','ready','failed')),
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS documents_user_created_idx ON documents(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS download_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  source_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','downloading','validating','processing','delivering','complete','failed','cancelled')),
  progress_bytes bigint NOT NULL DEFAULT 0 CHECK (progress_bytes >= 0),
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS download_jobs_user_created_idx ON download_jobs(user_id, created_at DESC);
