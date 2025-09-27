-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('announcement', 'event', 'maintenance', 'emergency') NOT NULL,
    attachment_urls JSON,
    posted_by VARCHAR(50) NOT NULL,
    audience ENUM('all', 'residents', 'owners', 'committee') DEFAULT 'all',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO announcements (
    id, title, content, type, attachment_urls, posted_by, audience, status, created_at, updated_at
) VALUES (
    'annc001',
    'ประกาศปิดน้ำชั่วคราว',
    'เรียนลูกบ้านทุกท่าน หมู่บ้านจะมีการปิดน้ำประปาชั่วคราวเพื่อซ่อมท่อหลักในวันที่ 28 กันยายน 2565 เวลา 09:00 - 16:00 น.',
    'announcement',
    '["https://example.com/water-shutdown.pdf"]',
    'user001',
    'all',
    'published',
    NOW(),
    NOW()
);

INSERT INTO announcements (
    id, title, content, type, attachment_urls, posted_by, audience, status, created_at, updated_at
) VALUES (
    'annc002',
    'กิจกรรมทำความสะอาดหมู่บ้าน',
    'ขอเชิญชวนลูกบ้านทุกท่านร่วมกิจกรรมทำความสะอาดหมู่บ้านในวันอาทิตย์ที่ 1 ตุลาคม 2565 เวลา 07:00 - 10:00 น.',
    'event',
    '["https://example.com/cleanup-event.pdf", "https://example.com/cleanup-poster.jpg"]',
    'user002',
    'residents',
    'published',
    NOW(),
    NOW()
);

INSERT INTO announcements (
    id, title, content, type, attachment_urls, posted_by, audience, status, created_at, updated_at
) VALUES (
    'annc003',
    'แจ้งค่าส่วนกลางประจำเดือนกันยายน',
    'ขอความร่วมมือชำระค่าส่วนกลางประจำเดือนกันยายน 2565 ภายในวันที่ 5 ตุลาคม 2565',
    'announcement',
    '["https://example.com/common-fee-september.pdf"]',
    'user003',
    'owners',
    'published',
    NOW(),
    NOW()
);
