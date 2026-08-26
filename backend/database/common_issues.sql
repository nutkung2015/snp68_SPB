-- Table สำหรับแจ้งปัญหาส่วนกลาง
-- ใช้สำหรับการแจ้งปัญหาในพื้นที่ส่วนกลาง เช่น สวน ถนน ลิฟต์ ฯลฯ

CREATE TABLE IF NOT EXISTS common_issues (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    unit_id VARCHAR(255) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_id VARCHAR(255),
    reported_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    issue_type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    description TEXT NOT NULL,
    image_urls TEXT,
    status ENUM(
        'pending',            
        'in_progress',        
        'resolved',           
        'rejected'            
    ) DEFAULT 'pending',
    phone_number VARCHAR(50),
    assigned_to VARCHAR(255),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    notes TEXT,
    resolved_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_unit_id (unit_id),
    INDEX idx_status (status),
    INDEX idx_reported_date (reported_date),
    INDEX idx_issue_type (issue_type)
);

-- ตัวอย่างข้อมูล
-- INSERT INTO common_issues (
--     id, unit_id, zone, reporter_name, issue_type, location, description, image_urls
-- ) VALUES (
--     'CI001', 'unit-uuid-here', 'A', 'สมหญิง รักสะอาด', 'lighting', 'ถนนหน้าโครงการ', 'ไฟส่องสว่างดับ', '["https://example.com/image1.jpg"]'
-- );
