-- Table สำหรับแจ้งซ่อมทรัพย์สินส่วนบุคคล
-- ใช้สำหรับการแจ้งซ่อมของตัวบ้าน เช่น ประตู หน้าต่าง ท่อน้ำ ไฟฟ้า ฯลฯ

CREATE TABLE IF NOT EXISTS personal_repairs (
    id VARCHAR(255) PRIMARY KEY,
    unit_id VARCHAR(255) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_id VARCHAR(255),
    submitted_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    repair_category ENUM(
        'plumbing',           
        'electrical',         
        'door_window',        
        'wall_ceiling',       
        'floor',              
        'roof',               
        'air_conditioning',   
        'other'               
    ) NOT NULL,
    repair_area VARCHAR(255),
    description TEXT NOT NULL,
    image_urls TEXT,
    status ENUM(
        'pending',            
        'in_progress',        
        'completed',          
        'rejected'            
    ) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    notes TEXT,
    completed_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_unit_id (unit_id),
    INDEX idx_status (status),
    INDEX idx_submitted_date (submitted_date),
    INDEX idx_repair_category (repair_category)
);

-- ตัวอย่างข้อมูล
-- INSERT INTO personal_repairs (
--     id, unit_id, zone, reporter_name, repair_category, repair_area, description, image_urls
-- ) VALUES (
--     'PR001', 'unit-uuid-here', 'A', 'สมชาย ใจดี', 'plumbing', 'ห้องน้ำชั้น 2', 'ท่อน้ำรั่ว', '["https://example.com/image1.jpg"]'
-- );
