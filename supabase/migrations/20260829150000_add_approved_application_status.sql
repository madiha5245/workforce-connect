-- Add APPROVED status to applications table
-- This migration safely extends the application status enum to support the new APPROVED workflow: APPLIED → APPROVED

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE applications DROP CONSTRAINT applications_status_check;

-- Step 2: Add the new CHECK constraint with APPROVED included
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