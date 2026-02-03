-- =============================================
-- SQL Migration: Add Expires At to Announcements
-- Date: 31 Jan 2026
-- =============================================

-- 1. Add expires_at column to announcements table
ALTER TABLE announcements 
ADD COLUMN expires_at TIMESTAMP NULL AFTER status;

-- 2. Add expiry_notified column to track if notification was sent
ALTER TABLE announcements 
ADD COLUMN expiry_notified BOOLEAN DEFAULT FALSE AFTER expires_at;

-- 3. Add project_id column if not exists (for filtering by project)
-- Note: Check if this column exists before running, skip if it does
-- ALTER TABLE announcements 
-- ADD COLUMN project_id VARCHAR(50) NULL AFTER id;

-- 4. Create index for faster expiry queries
CREATE INDEX idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX idx_announcements_expiry_notified ON announcements(expiry_notified);

-- 5. Update notification types in notifications table (if using ENUM)
-- Note: MySQL might need ALTER TABLE to add new ENUM values
-- Run this if you're using ENUM type for notification type
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
    'repair_status_update',
    'issue_status_update',
    'visitor_exit_stamp',
    'announcement',
    'system',
    'new_repair_request',
    'new_common_issue',
    'announcement_expiring',
    'daily_report'
) NOT NULL;

-- 6. Add 'report' to reference_type ENUM
ALTER TABLE notifications 
MODIFY COLUMN reference_type ENUM('repair', 'issue', 'visitor', 'announcement', 'report', 'none') DEFAULT 'none';

-- =============================================
-- Sample: Update existing announcements with expiry dates
-- =============================================
-- UPDATE announcements SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY) WHERE expires_at IS NULL;
