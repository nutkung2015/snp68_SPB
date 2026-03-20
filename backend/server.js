const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");

// Load environment variables
dotenv.config();

const app = express();

// ===========================================
// Trust Proxy Configuration (For Render/Cloud)
// ===========================================
// จำเป็นต้องเปิดเพื่อให้ express-rate-limit และ morgan 
// สามารถอ่าน IP จริงของ User ผ่าน Load Balancer (Proxy) ได้


// ===========================================
// Security Scanner Blocker (MUST be first middleware)
// ===========================================
// บล็อก bot ที่สแกนหาไฟล์ sensitive เช่น .env, .sql, config
// ใส่ก่อน middleware อื่นทั้งหมดเพื่อบล็อกตั้งแต่ต้น
const securityScannerBlocker = require('./middleware/securityScannerBlocker');
app.use(securityScannerBlocker);

// ===========================================
// Security Middleware: Helmet Configuration
// ===========================================
// 
// หลักการ:
// 1. Development: ยืดหยุ่น, อนุญาต localhost
// 2. Production: เข้มงวด, อนุญาตเฉพาะ Domain จริง
//
// ตัวแปร ENV ที่ต้องตั้ง:
// - ALLOWED_FRAME_ORIGINS: Domain ที่สามารถ Embed (iframe) Backend ได้
//   ตัวอย่าง: "http://localhost:8081,http://127.0.0.1:8081"
//   Production: "https://your-app.com"
// ===========================================

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // ใช้ 'loopback, linklocal, uniquelocal' เพื่อบอกให้ Express เชื่อถือ IP ที่เป็น Internal Network ทั้งหมด (เช่น 10.x.x.x ของ Render)
  // Express จะข้าม IP พวกนี้ไปเรื่อยๆ จนกว่าจะเจอ Public IP จริงๆ ของ User (Internet IP)
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
}

// อ่านค่า Allowed Frame Origins จาก ENV (ถ้าไม่มีใช้ค่า Default)
const allowedFrameOrigins = process.env.ALLOWED_FRAME_ORIGINS
  ? process.env.ALLOWED_FRAME_ORIGINS.split(',').map(origin => origin.trim())
  : isProduction
    ? ["'self'"] // Production: เข้มงวด - เฉพาะตัวเองเท่านั้น (ถ้าไม่ได้ตั้ง ENV)
    : ["'self'", "http://localhost:8081", "http://127.0.0.1:8081"]; // Dev: อนุญาต Localhost

// เพิ่ม 'self' เข้าไปด้วยเสมอ (ถ้ายังไม่มี)
if (!allowedFrameOrigins.includes("'self'")) {
  allowedFrameOrigins.unshift("'self'");
}

console.log(`🔒 Helmet CSP frameAncestors: [${allowedFrameOrigins.join(', ')}]`);

app.use(helmet({
  // -------------------------------------------
  // 1. X-Frame-Options (Legacy Header)
  // -------------------------------------------
  // ปิดไว้เพราะเราใช้ CSP frameAncestors แทน (ทันสมัยกว่า, ยืดหยุ่นกว่า)
  // X-Frame-Options รองรับแค่ DENY หรือ SAMEORIGIN ไม่สามารถระบุ Domain ได้
  xFrameOptions: false,

  // -------------------------------------------
  // 2. Content Security Policy (CSP)
  // -------------------------------------------
  // ควบคุมว่า Browser ของ User จะโหลด Resource จากไหนได้บ้าง
  // และใครสามารถ Embed (iframe) เว็บเราได้บ้าง
  contentSecurityPolicy: {
    directives: {
      // defaultSrc: แหล่งที่มาเริ่มต้นของทุก Resource
      // 'self' = โหลดจากโดเมนเดียวกันเท่านั้น
      defaultSrc: ["'self'"],

      // imgSrc: อนุญาตให้โหลดรูปภาพจากไหนบ้าง
      // - 'self': โดเมนเดียวกัน
      // - data:: รูป Base64 (data:image/png;base64,...)
      // - blob:: รูปที่สร้างจาก JS (URL.createObjectURL)
      // - Cloudinary: CDN ที่เก็บรูปของเรา
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],

      // scriptSrc: อนุญาตให้ Run JavaScript จากไหนบ้าง
      // 'unsafe-inline': อนุญาต <script> ใน HTML (จำเป็นสำหรับบาง Library)
      // ⚠️ Production: ควรใช้ nonce หรือ hash แทน 'unsafe-inline' ถ้าเป็นไปได้
      scriptSrc: ["'self'", "'unsafe-inline'"],

      // styleSrc: อนุญาตให้โหลด CSS จากไหนบ้าง
      styleSrc: ["'self'", "'unsafe-inline'"],

      // connectSrc: อนุญาตให้ fetch/XHR/WebSocket ไปที่ไหนบ้าง
      // Production: ควรระบุเฉพาะ API Endpoints ที่ใช้จริง
      connectSrc: ["'self'", "https://res.cloudinary.com", "https://*.cloudinary.com"],

      // -------------------------------------------
      // ⭐ frameAncestors: สำคัญสำหรับ PDF Viewer
      // -------------------------------------------
      // ควบคุมว่า Domain ไหนสามารถ Embed เว็บเราใน <iframe> ได้
      // ค่านี้มาจาก ENV Variable เพื่อให้ปรับได้ตาม Environment
      // 
      // Development: ["'self'", "http://localhost:8081", "http://127.0.0.1:8081"]
      //   - อนุญาต Expo Dev Server (localhost:8081) Embed เราได้
      //
      // Production: ["'self'", "https://your-app.com"]
      //   - อนุญาตเฉพาะ Domain จริงของ App
      //   - ไม่มี * (wildcard) เพื่อความปลอดภัย
      frameAncestors: allowedFrameOrigins,

      // frameSrc: ควบคุมว่าเราจะโหลด iframe มาจากไหนได้บ้าง (ตรงข้ามกับ frameAncestors)
      frameSrc: ["'self'", "https://docs.google.com"], // สำหรับ Google Docs Viewer บน Android

      // mediaSrc: สำหรับ <video> และ <audio>
      mediaSrc: ["'self'", "https://res.cloudinary.com"],

      // fontSrc: สำหรับ Web Fonts
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
    },
  },

  // -------------------------------------------
  // 3. Cross-Origin Resource Policy (CORP)
  // -------------------------------------------
  // ควบคุมว่าเว็บอื่นสามารถโหลด Resource ของเราได้หรือไม่
  // 
  // "same-origin": เฉพาะโดเมนเดียวกัน (เข้มงวดสุด)
  // "same-site": เฉพาะ Site เดียวกัน (เช่น *.example.com)
  // "cross-origin": อนุญาตข้ามโดเมน (จำเป็นสำหรับ PDF Proxy ของเรา)
  //
  // เราต้องใช้ "cross-origin" เพราะ:
  // - Frontend (localhost:8081) โหลด PDF จาก Backend (localhost:5000)
  // - ถ้าใช้ "same-origin" จะโดน Block
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // -------------------------------------------
  // 4. HTTP Strict Transport Security (HSTS)
  // -------------------------------------------
  // บอก Browser ว่าให้ใช้ HTTPS เท่านั้นในการเข้าเว็บนี้
  // 
  // ⚠️ เปิดเฉพาะ Production เพราะ:
  // - Development ใช้ HTTP (ไม่มี SSL Certificate)
  // - ถ้าเปิดใน Dev จะทำให้ Browser บังคับ HTTPS ซึ่ง localhost ทำไม่ได้
  strictTransportSecurity: isProduction ? {
    maxAge: 31536000,           // 1 ปี (ในหน่วยวินาที)
    includeSubDomains: true,    // รวมถึง Subdomain ทั้งหมด
    preload: true               // ลงทะเบียนใน HSTS Preload List ได้
  } : false,

  // -------------------------------------------
  // 5. Additional Security Headers
  // -------------------------------------------

  // Referrer-Policy: ควบคุมว่าจะส่ง Referer header ไปกับ Request หรือไม่
  // "strict-origin-when-cross-origin": ส่งเฉพาะ Origin เมื่อข้ามโดเมน
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-Content-Type-Options: ป้องกัน MIME Type Sniffing
  // Browser จะไม่พยายาม "เดา" ประเภทไฟล์ จะเชื่อ Content-Type ที่ Server ส่งมาเท่านั้น
  xContentTypeOptions: true,

  // X-DNS-Prefetch-Control: ปิดการ Prefetch DNS
  // ป้องกันการรั่วไหลข้อมูลว่า User กำลังจะเข้าเว็บไหน
  dnsPrefetchControl: { allow: false },

  // X-Download-Options: สำหรับ IE เก่า (ป้องกันการเปิดไฟล์โดยตรงแทนที่จะ Download)
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies: สำหรับ Flash/PDF (ปิดไม่ให้โหลดจากข้ามโดเมน)
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

// Helper function to get clean Client IP
// Prioritize Cloudflare header -> X-Forwarded-For -> req.ip
const getClientIp = (req) => {
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  // กรณี X-Forwarded-For อาจจะมาเป็น list เช่น "client, proxy1, proxy2"
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.ip;
};

// Logging Middleware
app.use(morgan((tokens, req, res) => {
  const clientIP = getClientIp(req);

  return [
    clientIP,
    '-',
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['res'](req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
}));

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://snp68-spb.onrender.com', 'https://api.livlink-solution.com']
    : [
      'http://localhost:8081',   // Expo Dev Server
      'http://localhost:4200',   // Angular Web Backoffice
      'http://127.0.0.1:5000',  // Backend Local
      'http://127.0.0.1:8081'
    ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const cookieParser = require("cookie-parser"); // Import cookie-parser

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser()); // Use cookie-parser middleware

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 400, // Limit each IP to 50 requests per 3 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req) // Use correct IP for rate limiting
});

const authLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 5, // Limit each IP to 5 login requests per 3 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req) // Use correct IP for rate limiting
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Test Native Backend API" });
});

// Static: Reset Password Page
const path = require('path');
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Posts routes
app.use("/api/posts", require("./routes/posts"));

// Mock News routes
app.use("/api/mock/news", require("./routes/mockNews"));

// Announcements routes
app.use("/api/announcements", require("./routes/announcements"));

// Upload routes
app.use("/api/upload", require("./routes/upload"));

// Auth routes
app.use("/api/auth", authRoutes);

const unitRoutes = require("./routes/units");
app.use("/api/units", unitRoutes);

// Project routes
app.use("/api/projects", projectRoutes);
app.use("/api/project-memberships", projectRoutes); // For project memberships endpoint
app.use("/api/project_invitations", require("./routes/project_invitations"));

// Repairs routes
app.use("/api/repairs", require("./routes/repairs"));

// Juristic routes
app.use("/api/juristic", require("./routes/juristicRoutes"));


app.use(
  "/api/project-customizations",
  require("./routes/projectCustomizations")
);

// New: Security & Visitor Management Routes
app.use("/api/security", require("./routes/security"));
app.use("/api/visitors", require("./routes/visitors"));

// Resident Management Routes (for residents)
app.use("/api/resident-management", require("./routes/manageResidentForResident"));

// Vehicle Management Routes (for residents)
app.use("/api/resident-vehicles", require("./routes/manageVehicleForResident"));

// Vehicle Management Routes (for juristic)
app.use("/api/juristic/vehicles", require("./routes/juristicVehicles"));

// Residents Route (All residents of a project)
app.use("/api/residents", require("./routes/residents"));

// Zone Management Routes
app.use("/api/zones", require("./routes/zones"));

// Guard Phone Routes
app.use("/api/guards", require("./routes/guards"));

// Guard Post (ป้อมยาม) Routes
app.use("/api/guard-posts", require("./routes/guardPosts"));

// Notification Routes
app.use("/api/notifications", require("./routes/notifications"));

// Super Admin Routes (Protected)
app.use("/api/super-admin", require("./routes/superAdmin"));

// Global Announcements for Users (Protected by auth only)
// Note: This endpoint is for normal users to fetch announcements, handled by the same controller
app.get("/api/global-announcements", require("./middleware/authMiddleware"), require("./controllers/globalAnnouncementController").getAnnouncementsForProject);

// Cron Jobs Admin Routes (for manual testing)
app.use("/api/admin/cron", require("./routes/cronAdminRoutes"));

// Error handling middleware
app.use(require("./middleware/errorMiddleware"));

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);

  // Initialize Cron Jobs for scheduled notifications
  try {
    const cronJobsService = require('./services/cronJobsService');
    cronJobsService.initializeCronJobs();
  } catch (cronError) {
    console.error('❌ Failed to initialize cron jobs:', cronError.message);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
