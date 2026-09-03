ALTER TABLE attendance ADD COLUMN excused_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN excused_at TEXT;
CREATE INDEX IF NOT EXISTS idx_attendance_excused ON attendance(school_id, excused, status);
