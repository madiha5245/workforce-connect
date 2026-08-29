-- Remove DISCUSSION status from applications table check constraint
-- Restores status constraint to: APPLIED, APPROVED, SHORTLISTED, INTERVIEW, HIRED, REJECTED

ALTER TABLE applications DROP CONSTRAINT applications_status_check;

ALTER TABLE applications
ADD CONSTRAINT applications_status_check CHECK (
    status IN (
        'APPLIED',
        'APPROVED',
        'SHORTLISTED',
        'INTERVIEW',
        'HIRED',
        'REJECTED'
    )
);
