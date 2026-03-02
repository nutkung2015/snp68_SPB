/**
 * Security Scanner Blocker Middleware
 * 
 * ป้องกัน bot scanner ที่พยายามเข้าถึงไฟล์ sensitive เช่น .env, .sql, config ฯลฯ
 * - บล็อก request ทันทีและส่ง 403 กลับ
 * - Log เตือนเมื่อตรวจพบ suspicious request
 * - Ban IP ที่ส่ง request ต้องสงสัยซ้ำๆ (in-memory auto-expire)
 * 
 * วิธีใช้: ใส่ก่อน middleware อื่นๆ ทั้งหมดใน server.js
 * app.use(securityScannerBlocker);
 */

// =============================================
// Configuration
// =============================================
const BAN_THRESHOLD = 5;           // จำนวน suspicious requests ก่อนจะ ban
const BAN_DURATION_MS = 30 * 60 * 1000; // Ban 30 นาที
const COUNTER_RESET_MS = 10 * 60 * 1000; // Reset counter ทุก 10 นาที

// =============================================
// Suspicious Patterns
// =============================================
// ไฟล์/path ที่ scanner มักจะหา
const BLOCKED_PATTERNS = [
    // Environment files
    /\/\.env/i,
    /\/\.envrc/i,

    // Config/Secret files  
    /\/secret\.yaml$/i,
    /\/secret\.yml$/i,
    /\/secrets\.yaml$/i,
    /\/secrets\.yml$/i,
    /\/\.kube\//i,
    /\/kubeconfig/i,

    // Docker configs
    /\/docker-compose\./i,
    /\/Dockerfile/i,

    // Database dumps
    /\/backup\.sql$/i,
    /\/dump\.sql$/i,
    /\/database\.sql$/i,
    /\/db\.sql$/i,
    /\/export\.sql$/i,
    /\.sql\.gz$/i,
    /\.sql\.bak$/i,

    // IDE/Editor configs
    /\/\.vscode\//i,
    /\/\.idea\//i,
    /\/\.sublime/i,

    // Cloud platform configs
    /\/\.netlify\//i,
    /\/\.vercel\//i,
    /\/amplify\//i,
    /\/\.firebase/i,
    /\/firebase\.json$/i,
    /\/serviceAccountKey/i,

    // Payment configs
    /\/stripe\//i,
    /\/payments\/\.env/i,
    /\/\.stripe\//i,

    // Git
    /\/\.git\//i,
    /\/\.gitignore$/i,
    /\/\.gitconfig$/i,

    // SSH keys
    /\/\.ssh\//i,
    /\/id_rsa/i,
    /\/id_ed25519/i,

    // Other sensitive files
    /\/\.htpasswd$/i,
    /\/\.htaccess$/i,
    /\/wp-config\.php$/i,
    /\/config\.php$/i,
    /\/\.npmrc$/i,
    /\/\.yarnrc$/i,
    /\/\.dockerignore$/i,
    /\/Procfile$/i,
    /\/\.aws\//i,
    /\/credentials$/i,
    /\/\.terraform\//i,
    /\/terraform\.tfstate/i,
    /\/\.ansible\//i,
    /\/vault\.yaml$/i,
    /\/supabase\/\.env/i,
    /\/planetscale\/\.env/i,

    // Common vulnerability scan paths
    /\/phpinfo/i,
    /\/phpmyadmin/i,
    /\/adminer/i,
    /\/wp-admin/i,
    /\/wp-login/i,
    /\/wp-content/i,
    /\/xmlrpc\.php/i,
    /\/admin\.php/i,
    /\/debug\//i,
    /\/trace\//i,
    /\/\.debug\//i,
];

// =============================================
// In-Memory IP Tracking
// =============================================
const suspiciousIPs = new Map(); // IP -> { count, firstSeen, banned, bannedAt }

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of suspiciousIPs.entries()) {
        // Remove ban if expired
        if (data.banned && (now - data.bannedAt > BAN_DURATION_MS)) {
            suspiciousIPs.delete(ip);
            continue;
        }
        // Remove counter if expired
        if (!data.banned && (now - data.firstSeen > COUNTER_RESET_MS)) {
            suspiciousIPs.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// =============================================
// Helper: Get Client IP
// =============================================
const getClientIp = (req) => {
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    return req.ip;
};

// =============================================
// Main Middleware
// =============================================
const securityScannerBlocker = (req, res, next) => {
    const clientIP = getClientIp(req);
    const requestPath = req.path || req.url;

    // 1. Check if IP is already banned
    const ipData = suspiciousIPs.get(clientIP);
    if (ipData && ipData.banned) {
        const remainingMs = BAN_DURATION_MS - (Date.now() - ipData.bannedAt);
        if (remainingMs > 0) {
            // Still banned - silently drop
            return res.status(403).end();
        } else {
            // Ban expired
            suspiciousIPs.delete(clientIP);
        }
    }

    // 2. Check if request matches suspicious patterns
    const isSuspicious = BLOCKED_PATTERNS.some(pattern => pattern.test(requestPath));

    if (isSuspicious) {
        // Track this IP
        const now = Date.now();
        if (ipData) {
            ipData.count += 1;

            // Check if should ban
            if (ipData.count >= BAN_THRESHOLD) {
                ipData.banned = true;
                ipData.bannedAt = now;
                console.warn(`🚫 [SECURITY] IP BANNED: ${clientIP} — ${ipData.count} suspicious requests detected. Banned for ${BAN_DURATION_MS / 60000} minutes.`);
            }
        } else {
            suspiciousIPs.set(clientIP, {
                count: 1,
                firstSeen: now,
                banned: false,
                bannedAt: null
            });
        }

        // Log the suspicious request
        console.warn(`⚠️  [SECURITY] Blocked suspicious request: ${clientIP} → ${req.method} ${requestPath}`);

        // Return 403 Forbidden (don't reveal if file exists or not)
        return res.status(403).json({
            error: 'Forbidden'
        });
    }

    // 3. Not suspicious - continue
    next();
};

// =============================================
// Exports
// =============================================
module.exports = securityScannerBlocker;
