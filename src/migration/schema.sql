-- ============================================================
-- WorkBoard - Schema SQL per migrazione da Base44
-- Database: PostgreSQL 14+
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'user', -- 'admin' | 'user'
  avatar_url    VARCHAR(500),
  created_date  TIMESTAMPTZ DEFAULT NOW(),
  updated_date  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   VARCHAR(255) NOT NULL,
  description            TEXT,
  client                 VARCHAR(255),
  status                 VARCHAR(50) DEFAULT 'active', -- 'active' | 'completed' | 'on_hold'
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

-- ============================================================
-- BOARDS
-- ============================================================
CREATE TABLE boards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  color        VARCHAR(50) DEFAULT 'indigo',
  status       VARCHAR(50) DEFAULT 'active', -- 'active' | 'archived'
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOARD MEMBERS
-- ============================================================
CREATE TABLE board_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_email   VARCHAR(255) NOT NULL,
  user_name    VARCHAR(255),
  role         VARCHAR(50) DEFAULT 'member', -- 'member' | 'guest'
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_email)
);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE commissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255) NOT NULL,
  client           VARCHAR(255) NOT NULL,
  description      TEXT,
  prepaid_hours    NUMERIC(10,2) NOT NULL DEFAULT 0,
  used_hours       NUMERIC(10,2) DEFAULT 0,
  status           VARCHAR(50) DEFAULT 'active', -- 'active' | 'completed' | 'on_hold'
  start_date       DATE,
  end_date         DATE,
  referenti        TEXT[] DEFAULT '{}',
  report_frequency VARCHAR(50) DEFAULT 'none', -- 'none' | 'weekly' | 'monthly'
  allowed_user_emails TEXT[] DEFAULT '{}',
  created_by       VARCHAR(255),
  created_date     TIMESTAMPTZ DEFAULT NOW(),
  updated_date     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================
CREATE TABLE custom_fields (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  label        VARCHAR(255) NOT NULL,
  key          VARCHAR(255) NOT NULL,
  type         VARCHAR(50) DEFAULT 'text', -- 'text' | 'number' | 'date' | 'select' | 'checkbox'
  options      TEXT[] DEFAULT '{}',
  position     INTEGER DEFAULT 0,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, key)
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  commission_id   UUID REFERENCES commissions(id) ON DELETE SET NULL,
  assignee_email  VARCHAR(255),
  assignee_name   VARCHAR(255),
  status          VARCHAR(50) DEFAULT 'todo', -- 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority        VARCHAR(50) DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
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

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
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

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email   VARCHAR(255) NOT NULL,
  type         VARCHAR(50) NOT NULL, -- 'task_assigned' | 'mention' | 'chat_message'
  title        VARCHAR(500) NOT NULL,
  message      TEXT,
  read         BOOLEAN DEFAULT FALSE,
  board_id     UUID REFERENCES boards(id) ON DELETE CASCADE,
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT MESSAGES (board chat)
-- ============================================================
CREATE TABLE project_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id     UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name  VARCHAR(255),
  content      TEXT NOT NULL,
  created_by   VARCHAR(255),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APP SETTINGS
-- ============================================================
CREATE TABLE app_settings (
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

-- ============================================================
-- SESSIONI / REFRESH TOKENS
-- ============================================================
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        VARCHAR(500) UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_tasks_board_id       ON tasks(board_id);
CREATE INDEX idx_tasks_assignee_email ON tasks(assignee_email);
CREATE INDEX idx_tasks_status         ON tasks(status);
CREATE INDEX idx_tasks_commission_id  ON tasks(commission_id);
CREATE INDEX idx_comments_task_id     ON comments(task_id);
CREATE INDEX idx_notifications_user   ON notifications(user_email, read);
CREATE INDEX idx_board_members_board  ON board_members(board_id);
CREATE INDEX idx_board_members_user   ON board_members(user_email);
CREATE INDEX idx_messages_board_id    ON project_messages(board_id);
CREATE INDEX idx_boards_project_id    ON boards(project_id);

-- ============================================================
-- TRIGGER: aggiornamento automatico updated_date
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','projects','boards','board_members','commissions',
    'custom_fields','tasks','comments','notifications','project_messages','app_settings']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_date()', tbl, tbl);
  END LOOP;
END;
$$;