-- Add DISCUSSION status to applications table
-- This migration safely extends the application status check constraint to support the DISCUSSION stage: APPROVED → DISCUSSION

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE applications DROP CONSTRAINT applications_status_check;

-- Step 2: Add the new CHECK constraint with DISCUSSION included
ALTER TABLE applications
ADD CONSTRAINT applications_status_check CHECK (
    status IN (
        'APPLIED',
        'APPROVED',
        'DISCUSSION',
        'SHORTLISTED',
        'INTERVIEW',
        'HIRED',
        'REJECTED'
    )
);
