/**
 * Cron Jobs Service
 * Scheduled tasks for notifications
 * 
 * Jobs:
 * 1. Check expiring announcements (daily at 09:00)
 * 2. Send daily report summary (daily at 08:00)
 */

const cron = require('node-cron');
const db = require('../config/db');
const pushNotificationService = require('./pushNotificationService');

/**
 * Check for announcements expiring tomorrow and send notifications
 * Runs daily at 09:00
 */
async function checkExpiringAnnouncements() {
    console.log('[CronJob] Checking for expiring announcements...');

    try {
        // Find announcements expiring tomorrow that haven't been notified yet
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [expiringAnnouncements] = await db.promise().query(
            `SELECT a.id, a.title, a.project_id, a.expires_at 
             FROM announcements a
             WHERE a.expires_at IS NOT NULL 
             AND a.expires_at BETWEEN ? AND ?
             AND a.expiry_notified = FALSE
             AND a.status = 'published'`,
            [today, tomorrow]
        );

        console.log(`[CronJob] Found ${expiringAnnouncements.length} expiring announcements`);

        for (const announcement of expiringAnnouncements) {
            try {
                // Send notification
                await pushNotificationService.notifyAnnouncementExpiring(
                    announcement.id,
                    announcement.project_id,
                    announcement.title,
                    announcement.expires_at
                );

                // Mark as notified
                await db.promise().execute(
                    `UPDATE announcements SET expiry_notified = TRUE WHERE id = ?`,
                    [announcement.id]
                );

                console.log(`[CronJob] Sent expiry notification for announcement: ${announcement.id}`);
            } catch (error) {
                console.error(`[CronJob] Error processing announcement ${announcement.id}:`, error);
            }
        }

        console.log('[CronJob] Finished checking expiring announcements');
    } catch (error) {
        console.error('[CronJob] Error in checkExpiringAnnouncements:', error);
    }
}

/**
 * Generate and send daily report summary to all projects
 * Runs daily at 08:00
 */
async function sendDailyReportSummary() {
    console.log('[CronJob] Generating daily report summaries...');

    try {
        // Get all active projects
        const [projects] = await db.promise().query(
            `SELECT id, name FROM projects`
        );

        console.log(`[CronJob] Processing ${projects.length} projects`);

        for (const project of projects) {
            try {
                // Get yesterday's date range
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Count new repairs from yesterday
                const [newRepairs] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM personal_repairs 
                     WHERE project_id = ? AND submitted_date >= ? AND submitted_date < ?`,
                    [project.id, yesterday, today]
                );

                // Count new common issues from yesterday
                const [newIssues] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM common_issues 
                     WHERE project_id = ? AND reported_date >= ? AND reported_date < ?`,
                    [project.id, yesterday, today]
                );

                // Count pending repairs
                const [pendingRepairs] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM personal_repairs 
                     WHERE project_id = ? AND status = 'pending'`,
                    [project.id]
                );

                // Count pending issues
                const [pendingIssues] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM common_issues 
                     WHERE project_id = ? AND status = 'pending'`,
                    [project.id]
                );

                // Count in progress
                const [inProgressRepairs] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM personal_repairs 
                     WHERE project_id = ? AND status = 'in_progress'`,
                    [project.id]
                );

                const [inProgressIssues] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM common_issues 
                     WHERE project_id = ? AND status = 'in_progress'`,
                    [project.id]
                );

                const summary = {
                    date: yesterday.toISOString().split('T')[0],
                    projectName: project.name,
                    newRepairs: newRepairs[0].count,
                    newIssues: newIssues[0].count,
                    pendingRepairs: pendingRepairs[0].count,
                    pendingIssues: pendingIssues[0].count,
                    pendingTotal: pendingRepairs[0].count + pendingIssues[0].count,
                    inProgressRepairs: inProgressRepairs[0].count,
                    inProgressIssues: inProgressIssues[0].count,
                    inProgressTotal: inProgressRepairs[0].count + inProgressIssues[0].count
                };

                // Only send if there's something to report
                if (summary.newRepairs > 0 || summary.newIssues > 0 || summary.pendingTotal > 0) {
                    await pushNotificationService.notifyDailyReport(project.id, summary);
                    console.log(`[CronJob] Sent daily report for project: ${project.name}`);
                } else {
                    console.log(`[CronJob] No activity for project: ${project.name}, skipping notification`);
                }
            } catch (error) {
                console.error(`[CronJob] Error processing project ${project.id}:`, error);
            }
        }

        console.log('[CronJob] Finished sending daily report summaries');
    } catch (error) {
        console.error('[CronJob] Error in sendDailyReportSummary:', error);
    }
}

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
    console.log('🕐 Initializing Cron Jobs...');

    // Check expiring announcements - Every day at 09:00 (Thailand timezone UTC+7)
    // Cron runs on server time, adjust according to server timezone
    cron.schedule('0 9 * * *', () => {
        console.log('[CronJob] Running: Check Expiring Announcements');
        checkExpiringAnnouncements();
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });
    console.log('  ✓ Expiring Announcements Check: Daily at 09:00 (Bangkok time)');

    // Send daily report - Every day at 08:00 (Thailand timezone)
    cron.schedule('0 8 * * *', () => {
        console.log('[CronJob] Running: Send Daily Report Summary');
        sendDailyReportSummary();
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });
    console.log('  ✓ Daily Report Summary: Daily at 08:00 (Bangkok time)');

    console.log('✅ Cron Jobs initialized successfully');
}

/**
 * Run a job manually (for testing)
 * @param {string} jobName - 'expiring' or 'daily'
 */
async function runJobManually(jobName) {
    switch (jobName) {
        case 'expiring':
            await checkExpiringAnnouncements();
            break;
        case 'daily':
            await sendDailyReportSummary();
            break;
        default:
            console.log('Unknown job:', jobName);
    }
}

module.exports = {
    initializeCronJobs,
    checkExpiringAnnouncements,
    sendDailyReportSummary,
    runJobManually
};
