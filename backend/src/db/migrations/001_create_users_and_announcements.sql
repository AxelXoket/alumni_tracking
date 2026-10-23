-- 001: users and announcements
-- Moves the two in-memory models of weeks 3-4 into PostgreSQL.
-- gen_random_uuid() is built into PostgreSQL 13+, no extension needed.

-- Keeps updated_at current on every UPDATE, so the application never has to.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            varchar(100) NOT NULL,
  email           varchar(255) NOT NULL,
  role            varchar(20)  NOT NULL DEFAULT 'alumni',
  department      varchar(120),
  graduation_year smallint,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT users_name_length_chk  CHECK (char_length(btrim(name)) >= 2),
  CONSTRAINT users_role_chk         CHECK (role IN ('alumni', 'student', 'faculty', 'admin')),
  CONSTRAINT users_grad_year_chk    CHECK (graduation_year BETWEEN 1950 AND 2100)
);

-- emails are unique regardless of letter case
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
CREATE TABLE announcements (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       varchar(150) NOT NULL,
  content     text         NOT NULL,
  category    varchar(20)  NOT NULL,
  priority    varchar(10)  NOT NULL DEFAULT 'normal',
  author      varchar(100) NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT announcements_title_length_chk   CHECK (char_length(btrim(title)) >= 3),
  CONSTRAINT announcements_content_length_chk CHECK (char_length(content) BETWEEN 10 AND 5000),
  CONSTRAINT announcements_category_chk       CHECK (category IN ('general', 'academic', 'career', 'event')),
  CONSTRAINT announcements_priority_chk       CHECK (priority IN ('low', 'normal', 'high'))
);

-- the board lists newest first, optionally narrowed to one category
CREATE INDEX announcements_created_at_idx ON announcements (created_at DESC);
CREATE INDEX announcements_category_created_idx ON announcements (category, created_at DESC);

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
