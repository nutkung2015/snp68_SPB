-- =============================================
-- SQL Migration: Push Notification System
-- Date: 5 Jan 2025
-- =============================================

-- 1. Device Tokens Table (เก็บ Push Token ของอุปกรณ์)
CREATE TABLE device_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    push_token VARCHAR(500) NOT NULL,
    device_type ENUM('ios', 'android') DEFAULT 'android',
    device_name VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_device_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_token (user_id, push_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);

-- 2. Notifications Table (เก็บประวัติการแจ้งเตือน)
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NULL,
    
    -- Notification Type
    type ENUM(
        'repair_status_update',     -- แจ้งซ่อม: อัพเดตสถานะ
        'issue_status_update',      -- รายงานปัญหา: อัพเดตสถานะ
        'visitor_exit_stamp',       -- ผู้มาเยี่ยม: ขอประทับตราขาออก
        'announcement',             -- ประกาศทั่วไป
        'system'                    -- ระบบ
    ) NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    
    -- Reference Data (เก็บ ID ที่เกี่ยวข้อง เพื่อ navigate ไปหน้านั้น)
    reference_type ENUM('repair', 'issue', 'visitor', 'announcement', 'none') DEFAULT 'none',
    reference_id VARCHAR(255) NULL,
    
    -- Extra Data (JSON)
    data JSON NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Push Status
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP NULL,
    push_error TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Add Foreign Keys (optional - if users table exists)
ALTER TABLE notifications
ADD CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;
