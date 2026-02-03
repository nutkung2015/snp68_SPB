/**
 * Cron Jobs Admin Routes
 * API endpoints for manually testing cron jobs
 * Only available in development mode
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Only import if cron service exists
let cronJobsService;
try {
    cronJobsService = require('../services/cronJobsService');
} catch (error) {
    console.warn('CronJobsService not available:', error.message);
}

/**
 * POST /api/admin/cron/run-expiring-announcements
 * Manually run the expiring announcements check
 * Protected: Requires authentication and admin/juristic role
 */
router.post('/run-expiring-announcements', authMiddleware, async (req, res) => {
    try {
        // Check if user has admin privileges
        if (req.user.role !== 'juristic' && req.user.role !== 'juristicLeader' && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ไม่มีสิทธิ์เข้าถึง'
            });
        }

        if (!cronJobsService) {
            return res.status(503).json({
                status: 'error',
                message: 'Cron Jobs Service not available'
            });
        }

        console.log('[Admin] Manually triggering: Check Expiring Announcements');
        await cronJobsService.checkExpiringAnnouncements();

        res.json({
            status: 'success',
            message: 'ทำการตรวจสอบประกาศที่ใกล้หมดอายุเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error running expiring announcements job:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาด',
            details: error.message
        });
    }
});

/**
 * POST /api/admin/cron/run-daily-report
 * Manually run the daily report summary
 * Protected: Requires authentication and admin/juristic role
 */
router.post('/run-daily-report', authMiddleware, async (req, res) => {
    try {
        // Check if user has admin privileges
        if (req.user.role !== 'juristic' && req.user.role !== 'juristicLeader' && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ไม่มีสิทธิ์เข้าถึง'
            });
        }

        if (!cronJobsService) {
            return res.status(503).json({
                status: 'error',
                message: 'Cron Jobs Service not available'
            });
        }

        console.log('[Admin] Manually triggering: Send Daily Report Summary');
        await cronJobsService.sendDailyReportSummary();

        res.json({
            status: 'success',
            message: 'ส่งรายงานประจำวันเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error running daily report job:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาด',
            details: error.message
        });
    }
});

/**
 * GET /api/admin/cron/status
 * Get cron jobs status
 */
router.get('/status', authMiddleware, (req, res) => {
    // Check if user has admin privileges
    if (req.user.role !== 'juristic' && req.user.role !== 'juristicLeader' && req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'ไม่มีสิทธิ์เข้าถึง'
        });
    }

    res.json({
        status: 'success',
        data: {
            service_available: !!cronJobsService,
            jobs: [
                {
                    name: 'Check Expiring Announcements',
                    schedule: 'Daily at 09:00 (Bangkok time)',
                    description: 'ตรวจสอบประกาศที่จะหมดอายุใน 1 วัน และส่ง notification'
                },
                {
                    name: 'Send Daily Report',
                    schedule: 'Daily at 08:00 (Bangkok time)',
                    description: 'ส่งรายงานสรุปประจำวันให้นิติบุคคล'
                }
            ]
        }
    });
});

module.exports = router;
