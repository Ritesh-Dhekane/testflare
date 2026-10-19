-- TestFlare schema v1. Times are Unix milliseconds. Ids are random UUIDs unless noted.

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,            -- lower-cased
  name TEXT,
  password_hash TEXT,                    -- "pbkdf2$<iterations>$<salt>$<hash>"; null for Google-only accounts
  google_sub TEXT UNIQUE,
  email_verified_at INTEGER,             -- null until the OTP or link is used
  created_at INTEGER NOT NULL
);

CREATE TABLE memberships (
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX memberships_user ON memberships(user_id);

-- id is the SHA-256 of the cookie value, so a leaked table can't be used to sign in.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,               -- 6-digit code, hashed
  link_token_hash TEXT NOT NULL UNIQUE,  -- token in the emailed link, hashed
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX email_verifications_user ON email_verifications(user_id);

-- Access periods. For now one 7-day period per company, started by the company; tiers come later.
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX subscriptions_company ON subscriptions(company_id, ends_at);

CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,             -- public URL
  package_name TEXT NOT NULL,
  description TEXT,
  icon_key TEXT,                         -- R2 key
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'testers')),
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (company_id, package_name)
);

-- Like cloud IAM keys: shown once, stored hashed, scoped to one app or all apps, expire with access.
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,                  -- first characters, to recognise a token in the list
  token_hash TEXT NOT NULL UNIQUE,
  app_id TEXT REFERENCES apps(id) ON DELETE CASCADE,  -- null = all apps
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX api_tokens_company ON api_tokens(company_id);

CREATE TABLE builds (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  min_sdk INTEGER,
  target_sdk INTEGER,
  size INTEGER NOT NULL,                 -- bytes
  r2_key TEXT NOT NULL,
  notes TEXT,                            -- "What's new"
  tags TEXT,                             -- JSON array, e.g. ["Bug fixes","Security update"]
  channel TEXT NOT NULL DEFAULT 'release',
  source TEXT NOT NULL CHECK (source IN ('web', 'api', 'cli', 'drive')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  uploaded_by_user TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_token TEXT REFERENCES api_tokens(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (app_id, version_code)
);
CREATE INDEX builds_app ON builds(app_id, created_at);

CREATE TABLE testers (
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_at INTEGER NOT NULL,
  accepted_at INTEGER,
  PRIMARY KEY (app_id, email)
);

CREATE TABLE downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  at INTEGER NOT NULL,
  country TEXT
);
CREATE INDEX downloads_build ON downloads(build_id);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT,
  user_id TEXT,
  token_id TEXT,
  action TEXT NOT NULL,                  -- e.g. "user.signup", "subscription.start"
  detail TEXT,                           -- JSON
  ip TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX audit_log_company ON audit_log(company_id, at);
