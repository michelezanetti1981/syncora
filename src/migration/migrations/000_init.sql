-- ============================================================
-- Migration 000: Schema iniziale completo
-- Applicata: setup iniziale
-- ============================================================

-- Tabella di tracking delle migrations (va creata una sola volta)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  description TEXT,
  applied_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'user',
  avatar_url    VARCHAR(500),
  created_date  TIMESTAMPTZ DEFAULT NOW(),
  updated_date  TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   VARCHAR(255) NOT NULL,
  description            TEXT,
  client                 VARCHAR(255),
  status                 VARCHAR(50) DEFAULT 'active',
  project_manager_email  VARCHAR(255),
  project_manager_name   VARCHAR(255),
  responsible_email      VARCHAR(255),
  responsible_name       VARCHAR(255),
  start_date             DATE,
  end_date               DATE,
  color                  VARCHAR(50) DEFAULT 'indigo',
  allowed_user_emails    TEXT[] DEFAULT '{}',
  created_by             VARCHAR(255),
  created_date           TIMESTAMPTZ DEFAULT NOW(),
  updated_date           TIMESTAMPTZ DEFAULT NOW()
);

-- BOARDS
CREATE TABLE IF NOT EXISTS boards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  color        VARCHAR(50) DEFAULT 'indigo',
  status       VARCHAR(50) DEFAULT 'active',
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- BOARD MEMBERS
CREATE TABLE IF NOT EXISTS board_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_email   VARCHAR(255) NOT NULL,
  user_name    VARCHAR(255),
  role         VARCHAR(50) DEFAULT 'member',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_email)
);

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS commissions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(255) NOT NULL,
  client              VARCHAR(255) NOT NULL,
  description         TEXT,
  prepaid_hours       NUMERIC(10,2) NOT NULL DEFAULT 0,
  used_hours          NUMERIC(10,2) DEFAULT 0,
  status              VARCHAR(50) DEFAULT 'active',
  start_date          DATE,
  end_date            DATE,
  referenti           TEXT[] DEFAULT '{}',
  report_frequency    VARCHAR(50) DEFAULT 'none',
  allowed_user_emails TEXT[] DEFAULT '{}',
  created_by          VARCHAR(255),
  created_date        TIMESTAMPTZ DEFAULT NOW(),
  updated_date        TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM FIELDS
CREATE TABLE IF NOT EXISTS custom_fields (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  label        VARCHAR(255) NOT NULL,
  key          VARCHAR(255) NOT NULL,
  type         VARCHAR(50) DEFAULT 'text',
  options      TEXT[] DEFAULT '{}',
  position     INTEGER DEFAULT 0,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, key)
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  commission_id   UUID REFERENCES commissions(id) ON DELETE SET NULL,
  assignee_email  VARCHAR(255),
  assignee_name   VARCHAR(255),
  status          VARCHAR(50) DEFAULT 'todo',
  priority        VARCHAR(50) DEFAULT 'medium',
  deadline        DATE,
  estimated_hours NUMERIC(10,2),
  logged_hours    NUMERIC(10,2) DEFAULT 0,
  file_urls       TEXT[] DEFAULT '{}',
  file_names      TEXT[] DEFAULT '{}',
  group_name      VARCHAR(255) DEFAULT 'Generale',
  position        INTEGER DEFAULT 0,
  custom_fields   JSONB DEFAULT '{}',
  created_by      VARCHAR(255),
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name  VARCHAR(255),
  content      TEXT NOT NULL,
  file_urls    TEXT[] DEFAULT '{}',
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email   VARCHAR(255) NOT NULL,
  type         VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  message      TEXT,
  read         BOOLEAN DEFAULT FALSE,
  board_id     UUID REFERENCES boards(id) ON DELETE CASCADE,
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT MESSAGES
CREATE TABLE IF NOT EXISTS project_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name  VARCHAR(255),
  content      TEXT NOT NULL,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url        VARCHAR(500),
  company_name    VARCHAR(255),
  smtp_host       VARCHAR(255),
  smtp_port       INTEGER DEFAULT 587,
  smtp_user       VARCHAR(255),
  smtp_password   VARCHAR(255),
  smtp_from_name  VARCHAR(255),
  smtp_from_email VARCHAR(255),
  smtp_secure     BOOLEAN DEFAULT FALSE,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        VARCHAR(500) UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- INDICI
CREATE INDEX IF NOT EXISTS idx_tasks_board_id       ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_email ON tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_commission_id  ON tasks(commission_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id     ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_email, read);
CREATE INDEX IF NOT EXISTS idx_board_members_board  ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user   ON board_members(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_board_id    ON project_messages(board_id);
CREATE INDEX IF NOT EXISTS idx_boards_project_id    ON boards(project_id);

-- TRIGGER: aggiornamento automatico updated_date
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','projects','boards','board_members','commissions',
    'custom_fields','tasks','comments','notifications','project_messages','app_settings']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s; CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_date()',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;

-- Registra questa migration
INSERT INTO schema_migrations (version, description)
VALUES ('000', 'Schema iniziale completo')
ON CONFLICT (version) DO NOTHING;