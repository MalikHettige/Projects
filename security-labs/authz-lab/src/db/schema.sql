-- AuthZ Lab schema — Phase 1 (modular monolith)
-- Numeric ids are the "legacy" id space; uuid columns are the "modern" one,
-- deliberately kept side by side so flaw 12 (file/object mismatch) and the
-- numeric-vs-uuid IDOR variants are natural, not bolted on.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE orgs (
  id            SERIAL PRIMARY KEY,
  uuid          UUID NOT NULL DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  parent_org_id INTEGER REFERENCES orgs(id), -- subsidiaries
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  uuid          UUID NOT NULL DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- bumped whenever role/membership changes; tokens carry the version
  -- they were issued with (see flaw 8: role-downgrade persistence)
  token_version INTEGER NOT NULL DEFAULT 1,
  is_platform_admin BOOLEAN NOT NULL DEFAULT false, -- support/admin portal
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TYPE membership_role AS ENUM ('owner','admin','manager','member','guest');
CREATE TYPE membership_status AS ENUM ('active','suspended','removed');

CREATE TABLE memberships (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  role        membership_role NOT NULL DEFAULT 'member',
  status      membership_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

CREATE TYPE document_state AS ENUM ('draft','submitted','approved','published','archived');

CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  uuid        UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  owner_id    INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  state       document_state NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE document_revisions (
  id          SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id),
  editor_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE invitation_status AS ENUM ('pending','accepted','expired','revoked','transferred');

CREATE TABLE invitations (
  id          SERIAL PRIMARY KEY,
  uuid        UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  email       TEXT NOT NULL,
  role        membership_role NOT NULL DEFAULT 'member',
  status      invitation_status NOT NULL DEFAULT 'pending',
  token       TEXT NOT NULL UNIQUE,
  invited_by  INTEGER NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  document_id INTEGER REFERENCES documents(id), -- the file's true parent
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  filename    TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE exports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|running|ready|failed
  download_key TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhooks (
  id          SERIAL PRIMARY KEY,
  org_id      INTEGER NOT NULL REFERENCES orgs(id),
  target_url  TEXT NOT NULL,
  secret      TEXT NOT NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every authorization decision, vulnerable or secure, is logged here.
-- This is what the mutation tests and attack-graph docs are built from.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES users(id),
  tenant_id   INTEGER REFERENCES orgs(id),
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  allowed     BOOLEAN NOT NULL,
  reason      TEXT NOT NULL,
  policy      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(org_id);
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_files_org ON files(org_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
