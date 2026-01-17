-- =============================================
-- Super Admin System Setup Script
-- =============================================

-- 1. admin_activity_logs
-- เก็บ Log กิจกรรมของ Super Admin เพื่อตรวจสอบย้อนหลัง
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id VARCHAR(255) NOT NULL COMMENT 'ID ของ User ที่เป็น Admin',
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'OTHER') NOT NULL,
    target_type VARCHAR(100) NOT NULL COMMENT 'สิ่งที่ถูก action เช่น project, user',
    target_id VARCHAR(255) COMMENT 'ID ของสิ่งที่ถูก action',
    details JSON COMMENT 'รายละเอียดเพิ่มเติมแบบ JSON',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 2. system_config
-- เก็บค่า Config ของระบบแบบ Key-Value
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(500),
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Initial System Config Data (Example)
INSERT IGNORE INTO system_config (config_key, config_value, config_type, description) VALUES
('maintenance_mode', 'false', 'boolean', 'System-wide maintenance mode'),
('default_theme_color', '#2A405E', 'string', 'Default primary color for new projects'),
('rate_limit_requests', '100', 'number', 'Global API rate limit per minute');

-- 3. project_feature_flags
-- เปิด/ปิด Feature ให้แต่ละโครงการ
CREATE TABLE IF NOT EXISTS project_feature_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL COMMENT 'Refer to projects.id (Assuming projects.id is INT based on typical setup, adjust if VARCHAR)',
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_feature (project_id, feature_name),
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 4. global_announcements
-- ประกาศจาก Super Admin ไปยังทุกโครงการ หรือเฉพาะโครงการ
CREATE TABLE IF NOT EXISTS global_announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('info', 'warning', 'maintenance', 'update', 'emergency') DEFAULT 'info',
    target_projects JSON COMMENT 'Array of project IDs, null means all projects',
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATETIME,
    end_date DATETIME,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
