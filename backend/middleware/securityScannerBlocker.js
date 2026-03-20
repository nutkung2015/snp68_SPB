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
const BAN_THRESHOLD = 3;           // จำนวน suspicious requests ก่อนจะ ban
const BAN_DURATION_MS = 60 * 60 * 1000; // Ban 1 ชั่วโมง
const COUNTER_RESET_MS = 10 * 60 * 1000; // Reset counter ทุก 10 นาที

// =============================================
// Whitelist — paths ที่ API ของเราใช้จริง (ข้ามการตรวจ)
// =============================================
const WHITELISTED_PATHS = [
    /^\/$/,                       // Root path
    /^\/api\//i,                  // All API routes
    /^\/reset-password/i          // Reset Password page
];

// =============================================
// Suspicious Patterns (Comprehensive ~200 patterns)
// =============================================
const BLOCKED_PATTERNS = [

    // ─────────────────────────────────────────
    // 1. Environment & Secret Files
    // ─────────────────────────────────────────
    /\/\.env/i,
    /\/\.envrc/i,
    /\/secret\.yaml$/i,
    /\/secret\.yml$/i,
    /\/secrets\.yaml$/i,
    /\/secrets\.yml$/i,
    /\/secret\.json$/i,
    /\/secrets\.json$/i,
    /\/\.secret/i,
    /\/\.credentials/i,
    /\/credentials\.json/i,
    /\/credentials\.xml/i,

    // ─────────────────────────────────────────
    // 2. Version Control
    // ─────────────────────────────────────────
    /\/\.git\b/i,
    /\/\.gitignore$/i,
    /\/\.gitconfig$/i,
    /\/\.gitmodules$/i,
    /\/\.svn/i,
    /\/\.hg\//i,
    /\/\.bzr\//i,
    /\/CVS\//i,
    /\/\.gitattributes$/i,
    /\/HEAD$/i,
    /\/packed-refs$/i,
    /\/config$/i,
    /\/FETCH_HEAD$/i,

    // ─────────────────────────────────────────
    // 3. Kubernetes / Docker / DevOps / CI-CD
    // ─────────────────────────────────────────
    /\/\.kube\//i,
    /\/kubeconfig/i,
    /\/docker-compose/i,
    /\/Dockerfile/i,
    /\/\.dockerignore$/i,
    /\/\.docker\//i,
    /\/Procfile$/i,
    /\/Vagrantfile$/i,
    /\/\.helm\//i,
    /\/helm\//i,
    /\/\.circleci\//i,
    /\/\.travis\.yml$/i,
    /\/\.gitlab-ci\.yml$/i,
    /\/\.github\//i,
    /\/Jenkinsfile$/i,
    /\/\.jenkins/i,
    /\/\.drone\.yml$/i,
    /\/\.buddy/i,
    /\/\.semaphore/i,
    /\/bitbucket-pipelines/i,
    /\/\.buildkite/i,
    /\/\.codeship/i,
    /\/Makefile$/i,
    /\/Rakefile$/i,
    /\/Gruntfile/i,
    /\/Gulpfile/i,

    // ─────────────────────────────────────────
    // 4. Cloud Platform Configs
    // ─────────────────────────────────────────
    /\/\.aws\//i,
    /\/\.azure\//i,
    /\/\.gcloud\//i,
    /\/\.netlify\//i,
    /\/\.vercel\//i,
    /\/amplify\//i,
    /\/\.firebase/i,
    /\/firebase\.json$/i,
    /\/\.firebaserc$/i,
    /\/serviceAccountKey/i,
    /\/service[-_.]?account/i,
    /\/gcp.*key.*\.json/i,
    /\/\.terraform\//i,
    /\/terraform\.tfstate/i,
    /\/terraform\.tfvars/i,
    /\/\.ansible\//i,
    /\/vault\.yaml$/i,
    /\/supabase\//i,
    /\/planetscale\//i,
    /\/\.heroku\//i,
    /\/\.flyctl/i,
    /\/fly\.toml$/i,
    /\/render\.yaml$/i,
    /\/\.digitalocean/i,
    /\/\.railway/i,

    // ─────────────────────────────────────────
    // 5. Database Dumps & Backups
    // ─────────────────────────────────────────
    /\.sql$/i,
    /\.sql\.gz$/i,
    /\.sql\.bak$/i,
    /\.sql\.zip$/i,
    /\.sql\.tar/i,
    /\.sqlite$/i,
    /\.sqlite3$/i,
    /\.mdb$/i,
    /\.dump$/i,
    /\/backup/i,
    /\/dump\b/i,
    /\/export\b.*\.(sql|csv|json|xml|gz|zip|tar)/i,
    /\/data\b.*\.(sql|csv|json|xml|gz|zip)/i,

    // ─────────────────────────────────────────
    // 6. IDE / Editor Configs
    // ─────────────────────────────────────────
    /\/\.vscode\//i,
    /\/\.idea\//i,
    /\/\.sublime/i,
    /\/\.atom\//i,
    /\/\.project$/i,
    /\/\.classpath$/i,
    /\/\.settings\//i,
    /\/nbproject\//i,
    /\/\.buildpath$/i,

    // ─────────────────────────────────────────
    // 7. Package Manager Files
    // ─────────────────────────────────────────
    /\/\.npmrc$/i,
    /\/\.yarnrc/i,
    /\/\.bowerrc$/i,
    /\/composer\.json$/i,
    /\/composer\.lock$/i,
    /\/Gemfile$/i,
    /\/Gemfile\.lock$/i,
    /\/requirements\.txt$/i,
    /\/package\.json$/i,
    /\/package-lock\.json$/i,
    /\/yarn\.lock$/i,
    /\/Pipfile/i,
    /\/pom\.xml$/i,
    /\/build\.gradle$/i,
    /\/\.cargo\//i,
    /\/go\.sum$/i,
    /\/go\.mod$/i,

    // ─────────────────────────────────────────
    // 8. SSH / Crypto Keys & Certificates
    // ─────────────────────────────────────────
    /\/\.ssh\//i,
    /\/id_rsa/i,
    /\/id_dsa/i,
    /\/id_ecdsa/i,
    /\/id_ed25519/i,
    /\/authorized_keys/i,
    /\/known_hosts/i,
    /\/\.pem$/i,
    /\/\.key$/i,
    /\/\.p12$/i,
    /\/\.pfx$/i,
    /\/\.crt$/i,
    /\/\.cer$/i,
    /\/\.jks$/i,
    /\/\.keystore$/i,
    /\/private.*key/i,
    /\/server\.key$/i,
    /\/\.gnupg\//i,
    /\/\.pgp/i,

    // ─────────────────────────────────────────
    // 9. Payment / API Configs
    // ─────────────────────────────────────────
    /\/stripe\//i,
    /\/\.stripe\//i,
    /\/config\/stripe/i,
    /\/paypal\//i,
    /\/\.paypal/i,
    /\/braintree\//i,
    /\/square\//i,
    /\/razorpay\//i,
    /\/payments\/\.env/i,

    // ─────────────────────────────────────────
    // 10. WordPress (server ไม่ใช่ WP — บล็อกทั้งหมด)
    // ─────────────────────────────────────────
    /\/wp-admin/i,
    /\/wp-login/i,
    /\/wp-content/i,
    /\/wp-includes/i,
    /\/wp-config/i,
    /\/wp-cron/i,
    /\/wp-json/i,
    /\/wp-signup/i,
    /\/wp-trackback/i,
    /\/wp-links-opml/i,
    /\/wp-comments-post/i,
    /\/wp-mail\.php/i,
    /\/wp-activate/i,
    /\/wp-blog-header/i,
    /\/wp-load/i,
    /\/wp-settings/i,
    /wlwmanifest\.xml/i,
    /\/xmlrpc\.php/i,
    /\/wordpress\//i,
    /\/wp\d*\//i,

    // ─────────────────────────────────────────
    // 11. Other CMS (Joomla, Drupal, Magento, etc.)
    // ─────────────────────────────────────────
    /\/administrator\//i,
    /\/joomla\//i,
    /\/drupal\//i,
    /\/magento\//i,
    /\/components\/com_/i,
    /\/sites\/default\//i,
    /\/typo3\//i,
    /\/concrete\//i,
    /\/craft\//i,
    /\/umbraco\//i,
    /\/sitecore\//i,
    /\/sitefinity\//i,
    /\/modx\//i,
    /\/bitrix\//i,
    /\/moodle\//i,
    /\/owa\//i,
    /\/webdav\//i,
    /\/sharepoint\//i,

    // ─────────────────────────────────────────
    // 12. PHP Exploits & Web Shells
    // ─────────────────────────────────────────
    /\.php$/i,
    /\.php\d$/i,
    /\.phtml$/i,
    /\.phar$/i,
    /\/phpinfo/i,
    /\/phpmyadmin/i,
    /\/pma\b/i,
    /\/myadmin/i,
    /\/adminer/i,
    /\/admin\.php/i,
    /\/shell\b/i,
    /\/c99\b/i,
    /\/r57\b/i,
    /\/webshell/i,
    /\/cmd\b/i,
    /\/eval-stdin/i,
    /\/backdoor/i,
    /\/b374k/i,
    /\/alfa\b/i,
    /\/FilesMan/i,
    /\/WSO\b/i,
    /\/uploadify/i,
    /\/elfinder/i,
    /\/kcfinder/i,
    /\/ckeditor\//i,
    /\/fckeditor\//i,
    /\/tiny_mce\//i,

    // ─────────────────────────────────────────
    // 13. ASP.NET / Windows Server
    // ─────────────────────────────────────────
    /\.aspx?$/i,
    /\.ashx$/i,
    /\.asmx$/i,
    /\.axd$/i,
    /\/web\.config/i,
    /\/applicationhost\.config/i,
    /\/machine\.config/i,
    /\/global\.asax/i,
    /\/elmah\.axd/i,
    /\/trace\.axd/i,
    /\/iisstart/i,
    /\/iissamples/i,
    /\/scripts\//i,
    /\/msadc\//i,

    // ─────────────────────────────────────────
    // 14. Java / Spring Boot / Tomcat
    // ─────────────────────────────────────────
    /\.jsp$/i,
    /\.jspa$/i,
    /\.do$/i,
    /\.action$/i,
    /\/WEB-INF\//i,
    /\/META-INF\//i,
    /\/actuator/i,
    /\/heapdump/i,
    /\/threaddump/i,
    /\/jolokia/i,
    /\/manager\//i,
    /\/jmx/i,
    /\/status$/i,
    /\/invoker\//i,
    /\/struts\//i,
    /\/axis2?\//i,
    /\/solr\//i,

    // ─────────────────────────────────────────
    // 15. Laravel / Symfony / Ruby / Python Frameworks
    // ─────────────────────────────────────────
    /\/storage\/logs/i,
    /\/storage\/framework/i,
    /\/vendor\//i,
    /\/artisan$/i,
    /\/telescope/i,
    /\/horizon/i,
    /\/nova\//i,
    /\/app\/etc\/local\.xml/i,
    /\/config\/database\.yml/i,
    /\/config\/secrets\.yml/i,
    /\/config\/master\.key/i,
    /\/config\/credentials\.yml/i,
    /\/rails\/info/i,
    /\/debug\/default/i,
    /\/django/i,
    /\/flask/i,
    /\/settings\.py$/i,
    /\/manage\.py$/i,
    /\/wsgi\.py$/i,

    // ─────────────────────────────────────────
    // 16. Apache / Nginx / Server Configs
    // ─────────────────────────────────────────
    /\/\.htpasswd/i,
    /\/\.htaccess/i,
    /\/server-status/i,
    /\/server-info/i,
    /\/nginx\.conf/i,
    /\/httpd\.conf/i,
    /\/\.nginx/i,
    /\/\.apache/i,
    /\/cgi-bin\//i,
    /\/fcgi-bin\//i,
    /\/\.user\.ini$/i,
    /\/php\.ini$/i,
    /\/my\.cnf$/i,
    /\/my\.ini$/i,
    /\/\.mysql_history/i,
    /\/\.bash_history/i,
    /\/\.bashrc$/i,
    /\/\.profile$/i,
    /\/\.zshrc$/i,

    // ─────────────────────────────────────────
    // 17. Logs & Debug Endpoints
    // ─────────────────────────────────────────
    /\/debug\b/i,
    /\/trace\b/i,
    /\/\.debug/i,
    /\/error\.log/i,
    /\/access\.log/i,
    /\/debug\.log/i,
    /\/application\.log/i,
    /\/app\.log/i,
    /\/\.log$/i,
    /\/logs\//i,
    /\/tmp\//i,
    /\/temp\//i,

    // ─────────────────────────────────────────
    // 18. Path Traversal Attacks
    // ─────────────────────────────────────────
    /\.\.\//,                    // ../
    /\.\.\\/,                    // ..\
    /\.\.%2f/i,                  // URL encoded ../
    /\.\.%5c/i,                  // URL encoded ..\
    /%2e%2e/i,                   // Double URL encoded ..
    /%252e/i,                    // Double encoded .
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\/etc\/hosts/i,
    /\/proc\/self/i,
    /\/proc\/version/i,
    /\/proc\/environ/i,
    /\/windows\/system32/i,
    /\/windows\/win\.ini/i,
    /\/boot\.ini/i,
    /\/WEB-INF\/web\.xml/i,

    // ─────────────────────────────────────────
    // 19. API Documentation (ไม่ควรเปิด public)
    // ─────────────────────────────────────────
    /\/swagger/i,
    /\/api-docs/i,
    /\/openapi/i,
    /\/graphql/i,
    /\/graphiql/i,
    /\/playground/i,
    /\/altair/i,
    /\/_debug/i,
    /\/metrics$/i,
    // /\/\.well-known\//i, // ปิดไว้เพราะ Chrome DevTools ชอบแอบเรียกใช้ ทำให้ Dev โดนแบน

    // ─────────────────────────────────────────
    // 20. Admin Panels & Login Pages
    // ─────────────────────────────────────────
    /\/cpanel/i,
    /\/webmail/i,
    /\/controlpanel/i,
    /\/filemanager/i,
    /\/phppgadmin/i,
    /\/autoconfig/i,
    /\/autodiscover/i,
    /\/remote\//i,
    /\/console\b/i,

    // ─────────────────────────────────────────
    // 21. Backup & Archive Files
    // ─────────────────────────────────────────
    /\.bak$/i,
    /\.old$/i,
    /\.orig$/i,
    /\.save$/i,
    /\.swp$/i,
    /\.swo$/i,
    /\.tmp$/i,
    /\.temp$/i,
    /\.copy$/i,
    /\.dist$/i,
    /\.tar$/i,
    /\.tar\.gz$/i,
    /\.tgz$/i,
    /\.zip$/i,
    /\.rar$/i,
    /\.7z$/i,
    /\.gz$/i,
    /~$/,                        // backup files ending with ~

    // ─────────────────────────────────────────
    // 22. Miscellaneous Probes
    // ─────────────────────────────────────────
    /\/crossdomain\.xml/i,
    /\/clientaccesspolicy\.xml/i,
    /\/\.well-known\/security\.txt/i,
    /\/\.DS_Store$/i,
    /\/Thumbs\.db$/i,
    /\/desktop\.ini$/i,
    /\/_wpeprivate/i,
    /\/\.smileys/i,
    /\/test\b/i,
    /\/testing\b/i,
    /\/staging\b/i,
    /\/demo\b/i,
    /\/dev\b/i,
    /\/old\b/i,
    /\/new\b/i,
    /\/beta\b/i,
    /\/alpha\b/i,
    /\/install\b/i,
    /\/setup\b/i,

    // ─────────────────────────────────────────
    // 23. Common Scanner User Agent Paths
    // ─────────────────────────────────────────
    /\/HNAP1/i,                  // Router exploit
    /\/cgi\//i,
    /\/scripts\/setup\.php/i,
    /\/muieblackcat/i,
    /\/recordings\//i,
    /\/config\b/i,
    /\/conf\b/i,
    /\/configuration\b/i,
    /\/internal\b/i,
    /\/private\b/i,
    /\/secret\b/i,
    /\/hidden\b/i,
];

// =============================================
// In-Memory IP Tracking
// =============================================
const suspiciousIPs = new Map(); // IP -> { count, firstSeen, banned, bannedAt }

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of suspiciousIPs.entries()) {
        if (data.banned && (now - data.bannedAt > BAN_DURATION_MS)) {
            suspiciousIPs.delete(ip);
            continue;
        }
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

    // 0. Check whitelist first — ถ้าเป็น API route ให้ผ่านทันที
    const isWhitelisted = WHITELISTED_PATHS.some(pattern => pattern.test(requestPath));
    if (isWhitelisted) {
        return next();
    }

    // 1. Check if IP is already banned
    const ipData = suspiciousIPs.get(clientIP);
    if (ipData && ipData.banned) {
        const remainingMs = BAN_DURATION_MS - (Date.now() - ipData.bannedAt);
        if (remainingMs > 0) {
            return res.status(403).end();
        } else {
            suspiciousIPs.delete(clientIP);
        }
    }

    // 2. Check if request matches suspicious patterns
    const isSuspicious = BLOCKED_PATTERNS.some(pattern => pattern.test(requestPath));

    if (isSuspicious) {
        const now = Date.now();
        if (ipData) {
            ipData.count += 1;

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
