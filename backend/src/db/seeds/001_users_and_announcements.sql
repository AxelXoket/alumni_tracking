-- 001: sample users and announcements
-- Fixed ids so links in the docs and tests stay stable.
-- ON CONFLICT DO NOTHING keeps the seed idempotent and never overwrites
-- changes made through the app after the first start.

INSERT INTO users (id, name, email, role, department, graduation_year, created_at, updated_at) VALUES
  ('6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01', 'Elif Yılmaz', 'elif.yilmaz@alumni.example.edu', 'alumni',  'Computer Engineering',    2019, '2025-09-01T09:00:00Z', '2025-09-01T09:00:00Z'),
  ('6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e02', 'Mert Kaya',   'mert.kaya@student.example.edu',  'student', 'Software Engineering',    2027, '2025-09-02T10:30:00Z', '2025-09-02T10:30:00Z'),
  ('6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e03', 'Ayşe Demir',  'ayse.demir@example.edu',         'faculty', 'Computer Engineering',    NULL, '2025-09-03T08:15:00Z', '2025-09-03T08:15:00Z'),
  ('6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e04', 'Can Öztürk',  'can.ozturk@example.edu',         'admin',   'Alumni Relations Office', NULL, '2025-09-04T12:00:00Z', '2025-09-04T12:00:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO announcements (id, title, content, category, priority, author, created_at, updated_at) VALUES
  ('3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b01',
   'Spring Graduate Reunion 2026',
   'All graduates are invited to the spring reunion on campus. The day starts with a short welcome talk by the head of department, continues with lab tours and ends with dinner in the main hall.',
   'event', 'high', 'Alumni Relations Office', '2025-10-01T09:00:00Z', '2025-10-01T09:00:00Z'),
  ('3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b02',
   'Mentoring program applications are open',
   'Alumni who want to mentor final-year students can apply until the end of the month. Mentors meet their students online twice a month for one semester.',
   'career', 'normal', 'Career Center', '2025-10-05T13:30:00Z', '2025-10-05T13:30:00Z'),
  ('3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b03',
   'Guest lecture: building reliable distributed systems',
   'A 2015 graduate now working as a staff engineer will talk about lessons learned while scaling payment systems. Open to students and alumni.',
   'academic', 'normal', 'Computer Engineering Department', '2025-10-08T08:00:00Z', '2025-10-08T08:00:00Z'),
  ('3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b04',
   'Library access for alumni',
   'Graduates can now renew their library cards online and keep remote access to the digital journals.',
   'general', 'low', 'University Library', '2025-10-10T11:45:00Z', '2025-10-10T11:45:00Z')
ON CONFLICT DO NOTHING;
