-- 002: job postings and applications
--
-- users 1 ──< N job_postings          a user (usually an alumnus) posts jobs
-- users N >──< M job_postings         through applications (join entity)
--
-- Deleting a user removes the jobs they posted and the applications they
-- sent; deleting a job removes its applications (ON DELETE CASCADE).

-- ---------------------------------------------------------------------------
-- job_postings (one-to-many from users)
-- ---------------------------------------------------------------------------
CREATE TABLE job_postings (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title           varchar(150) NOT NULL,
  company         varchar(150) NOT NULL,
  location        varchar(120),
  work_mode       varchar(10)  NOT NULL DEFAULT 'onsite',
  employment_type varchar(20)  NOT NULL DEFAULT 'full_time',
  description     text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT job_postings_title_length_chk   CHECK (char_length(btrim(title)) >= 2),
  CONSTRAINT job_postings_company_length_chk CHECK (char_length(btrim(company)) >= 2),
  CONSTRAINT job_postings_work_mode_chk      CHECK (work_mode IN ('onsite', 'hybrid', 'remote')),
  CONSTRAINT job_postings_employment_chk     CHECK (employment_type IN ('full_time', 'part_time', 'internship', 'contract')),
  CONSTRAINT job_postings_description_chk    CHECK (description IS NULL OR char_length(description) <= 5000)
);

-- foreign keys are not indexed automatically in PostgreSQL
CREATE INDEX job_postings_user_id_idx    ON job_postings (user_id);
CREATE INDEX job_postings_created_at_idx ON job_postings (created_at DESC);

CREATE TRIGGER job_postings_set_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- applications (many-to-many join entity between users and job_postings)
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  job_posting_id uuid        NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
  status         varchar(20) NOT NULL DEFAULT 'applied',
  cover_letter   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT applications_status_chk       CHECK (status IN ('applied', 'reviewing', 'interview', 'accepted', 'rejected')),
  CONSTRAINT applications_cover_letter_chk CHECK (cover_letter IS NULL OR char_length(cover_letter) <= 2000),
  -- business rule: one application per user per job (API answers 409)
  CONSTRAINT applications_user_job_uq      UNIQUE (user_id, job_posting_id)
);

-- the unique constraint already indexes (user_id, job_posting_id), which also
-- serves "applications of a user"; "applications of a job" needs its own index
CREATE INDEX applications_job_posting_id_idx ON applications (job_posting_id);
CREATE INDEX applications_status_idx         ON applications (status);

CREATE TRIGGER applications_set_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
