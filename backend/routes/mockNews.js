const express = require('express');
const router = express.Router();

// Mock data
const mockNews = [
    {
        id: 1,
        title: "ประกาศหยุดน้ำประปา",
        content: "แจ้งหยุดน้ำประปาในวันที่ 30 กันยายน 2565 เวลา 09.00-16.00 น. เนื่องจากมีการซ่อมแซมท่อประปาหลัก",
        type: "announcement",
        author: "ผู้จัดการหมู่บ้าน",
        imageUrl: "https://picsum.photos/300/200",
        createdAt: "2025-09-27T08:00:00.000Z",
        status: "active"
    },
    {
        id: 2,
        title: "กิจกรรมทำความสะอาดหมู่บ้าน",
        content: "ขอเชิญชวนลูกบ้านทุกท่านร่วมกิจกรรมทำความสะอาดหมู่บ้านในวันอาทิตย์ที่ 1 ตุลาคม 2565 เวลา 07.00-10.00 น.",
        type: "event",
        author: "คณะกรรมการหมู่บ้าน",
        imageUrl: "https://picsum.photos/300/200",
        createdAt: "2025-09-26T15:30:00.000Z",
        status: "active"
    },
    {
        id: 3,
        title: "แจ้งค่าส่วนกลางประจำเดือนกันยายน",
        content: "ขอความร่วมมือชำระค่าส่วนกลางประจำเดือนกันยายน 2565 ภายในวันที่ 5 ตุลาคม 2565",
        type: "announcement",
        author: "ฝ่ายการเงิน",
        imageUrl: "https://picsum.photos/300/200",
        createdAt: "2025-09-25T10:15:00.000Z",
        status: "active"
    }
];

// Get all news
router.get('/', (req, res) => {
    res.json({
        status: 'success',
        data: mockNews
    });
});

// Get news by ID
router.get('/:id', (req, res) => {
    const newsId = parseInt(req.params.id);
    const news = mockNews.find(item => item.id === newsId);
    
    if (!news) {
        return res.status(404).json({
            status: 'error',
            message: 'News not found'
        });
    }
    
    res.json({
        status: 'success',
        data: news
    });
});

// Get news by type
router.get('/type/:type', (req, res) => {
    const newsType = req.params.type;
    const filteredNews = mockNews.filter(item => item.type === newsType);
    
    res.json({
        status: 'success',
        data: filteredNews
    });
});

router.put('/:id', (req, res) => {
    const newsId = parseInt(req.params.id);
    const newsIndex = mockNews.findIndex(item => item.id === newsId);
    
    if (newsIndex === -1) {
        return res.status(404).json({
            status: 'error',
            message: 'News not found'
        });
    }
    
    // Update the news item
    mockNews[newsIndex] = { ...mockNews[newsIndex], ...req.body };
    
    res.json({
        status: 'success',
        data: mockNews[newsIndex]
    });
});

module.exports = router;