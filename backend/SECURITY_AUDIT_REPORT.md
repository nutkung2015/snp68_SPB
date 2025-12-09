# 🔒 Backend Security Audit Report

**Project:** SNP68 SPB Backend  
**Date:** 2025-12-10  
**Audited By:** Security Review  
**Overall Security Score:** 7.5/10 ⚠️

---

## 📊 Executive Summary

โปรเจค backend นี้มีระบบความปลอดภัยพื้นฐานที่ดี แต่ยังมีจุดที่ต้องปรับปรุงเพื่อความปลอดภัยที่สมบูรณ์ยิ่งขึ้น

### ✅ จุดแข็ง:
- ใช้ JWT authentication
- มี bcrypt สำหรับ hash passwords
- ใช้ parameterized queries (ป้องกัน SQL injection)
- มี authMiddleware ครอบคลุม
- มี role-based access control

### ⚠️ จุดที่ต้องปรับปรุง:
- CORS เปิดกว้างเกินไป
- ไม่มี rate limiting
- JWT token expire time สั้นเกินไป (1 นาที)
- ไม่มี input validation middleware
- ไม่มี helmet.js สำหรับ security headers
- ไม่มี HTTPS enforcement
- Error messages เปิดเผยข้อมูลมากเกินไป

---

## 🔍 Detailed Security Analysis

### 1. Authentication & Authorization ⭐⭐⭐⭐☆ (8/10)

#### ✅ ดี:
```javascript
// ใช้ bcrypt สำหรับ hash passwords
const hashedPassword = await bcrypt.hash(password, 10);

// JWT authentication
const token = jwt.sign(
  { id: userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" } // ควรเป็น 7d ไม่ใช่ 1m
);

// authMiddleware ตรวจสอบ token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

#### ⚠️ ปัญหา:
1. **JWT Token Expiration สั้นเกินไป:**
   ```javascript
   // ❌ ใน authController.js register()
   { expiresIn: "1m" } // 1 นาที - สั้นเกินไป!
   
   // ✅ ควรเป็น
   { expiresIn: "7d" } // 7 วัน
   ```

2. **ไม่มี Refresh Token:**
   - ควรมีระบบ refresh token สำหรับ long-term sessions

3. **JWT_SECRET อาจไม่ปลอดภัย:**
   ```bash
   # ตรวจสอบว่า JWT_SECRET มีความยาวและความซับซ้อนเพียงพอ
   # ควรมีอย่างน้อย 64 characters
   ```

**แนะนำ:**
```javascript
// authController.js - register()
const token = jwt.sign(
  { id: userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" } // เปลี่ยนจาก 1m เป็น 7d
);
```

---

### 2. SQL Injection Protection ⭐⭐⭐⭐⭐ (10/10)

#### ✅ ดีมาก:
```javascript
// ใช้ parameterized queries ทุกที่
const [user] = await db.promise().query(
  "SELECT * FROM users WHERE email = ?",
  [email]
);

// ไม่มี string concatenation ใน SQL
// ✅ ปลอดภัย
```

**สรุป:** ไม่พบช่องโหว่ SQL Injection

---

### 3. CORS Configuration ⭐⭐☆☆☆ (4/10)

#### ❌ ปัญหาร้ายแรง:
```javascript
// server.js
app.use(cors()); // ❌ เปิดกว้างเกินไป! อนุญาตทุก origin
```

**ความเสี่ยง:**
- อนุญาตให้ทุก domain เรียก API ได้
- เสี่ยงต่อ CSRF attacks
- ไม่มีการควบคุม credentials

**แนะนำ:**
```javascript
// server.js
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com', 'https://your-app.com']
    : ['http://localhost:3000', 'http://localhost:19006'], // Expo dev
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

### 4. Rate Limiting ⭐☆☆☆☆ (2/10)

#### ❌ ไม่มีเลย:
```javascript
// ไม่มี rate limiting
// เสี่ยงต่อ:
// - Brute force attacks
// - DDoS attacks
// - API abuse
```

**แนะนำ:**
```bash
npm install express-rate-limit
```

```javascript
// server.js
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

---

### 5. Input Validation ⭐⭐⭐☆☆ (6/10)

#### ⚠️ มีบ้าง แต่ไม่ครอบคลุม:
```javascript
// มีการตรวจสอบพื้นฐาน
if (!project_id || !unit_number) {
  return res.status(400).json({ message: "Required fields missing" });
}

// แต่ไม่มี validation library
```

**แนะนำ:**
```bash
npm install joi
# หรือ
npm install express-validator
```

```javascript
// middleware/validation.js
const Joi = require('joi');

const registerSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
});

const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      status: 'error',
      message: error.details[0].message 
    });
  }
  next();
};

module.exports = { validateRegister };
```

---

### 6. Security Headers ⭐☆☆☆☆ (2/10)

#### ❌ ไม่มี helmet.js:
```javascript
// ไม่มี security headers
// เสี่ยงต่อ:
// - XSS attacks
// - Clickjacking
// - MIME sniffing
```

**แนะนำ:**
```bash
npm install helmet
```

```javascript
// server.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 7. Error Handling ⭐⭐⭐☆☆ (6/10)

#### ⚠️ เปิดเผยข้อมูลมากเกินไป:
```javascript
// ❌ เปิดเผย stack trace
app.use((err, req, res, next) => {
  console.error(err.stack); // OK สำหรับ logging
  res.status(500).json({ message: "Something went wrong!" }); // ✅ ดี
});

// แต่ใน controllers บางตัว
catch (error) {
  console.error("Error:", error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    details: error.message // ❌ เปิดเผยข้อมูลมากเกินไป
  });
}
```

**แนะนำ:**
```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // ไม่เปิดเผย error details ใน production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

---

### 8. File Upload Security ⭐⭐⭐☆☆ (6/10)

#### ⚠️ มีความเสี่ยง:
```javascript
// multer config
const upload = multer({ dest: 'uploads/' });

// ❌ ไม่มี file type validation
// ❌ ไม่มี file size limit (มีแต่ใน express.json)
// ❌ ไม่มี filename sanitization
```

**แนะนำ:**
```javascript
// middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

module.exports = upload;
```

---

### 9. Environment Variables ⭐⭐⭐⭐☆ (8/10)

#### ✅ ดี:
```javascript
// ใช้ dotenv
require("dotenv").config();

// มี .gitignore สำหรับ .env files
// มี .env.example
```

#### ⚠️ ควรปรับปรุง:
```bash
# ตรวจสอบว่า JWT_SECRET มีความปลอดภัย
# ควรมีอย่างน้อย 64 characters
# สร้างด้วย:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 10. Database Security ⭐⭐⭐⭐☆ (8/10)

#### ✅ ดี:
```javascript
// SSL สำหรับ production
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  };
}

// Connection pooling
connectionLimit: 10,
```

#### ⚠️ ควรเพิ่ม:
- Database connection retry logic
- Connection timeout
- Query timeout

---

## 🚨 Critical Issues (ต้องแก้ไขด่วน)

### 1. CORS Configuration
**Severity:** HIGH  
**Impact:** อนุญาตให้ทุก domain เรียก API  
**Fix:**
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));
```

### 2. No Rate Limiting
**Severity:** HIGH  
**Impact:** เสี่ยงต่อ brute force และ DDoS  
**Fix:** ติดตั้ง express-rate-limit

### 3. JWT Token Expiration (1 minute)
**Severity:** MEDIUM  
**Impact:** ผู้ใช้ต้อง login บ่อยเกินไป  
**Fix:** เปลี่ยนเป็น 7d

### 4. No Security Headers
**Severity:** MEDIUM  
**Impact:** เสี่ยงต่อ XSS, clickjacking  
**Fix:** ติดตั้ง helmet.js

---

## ✅ Quick Wins (แก้ไขง่าย ผลลัพธ์ดี)

### 1. เพิ่ม Helmet.js
```bash
npm install helmet
```
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 2. เพิ่ม Rate Limiting
```bash
npm install express-rate-limit
```
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

### 3. แก้ไข CORS
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : 'http://localhost:3000',
  credentials: true
}));
```

### 4. แก้ไข JWT Expiration
```javascript
// authController.js
{ expiresIn: "7d" } // เปลี่ยนจาก "1m"
```

---

## 📋 Security Checklist

### Authentication & Authorization
- [x] ใช้ bcrypt สำหรับ passwords
- [x] ใช้ JWT authentication
- [x] มี authMiddleware
- [x] มี role-based access control
- [ ] มี refresh token mechanism
- [ ] มี password reset functionality
- [ ] มี account lockout หลัง failed attempts

### Input Validation
- [x] ใช้ parameterized queries
- [ ] มี input validation middleware
- [ ] มี sanitization
- [ ] มี file upload validation

### Security Headers & CORS
- [ ] ใช้ helmet.js
- [ ] CORS configuration ถูกต้อง
- [ ] HTTPS enforcement
- [ ] CSP headers

### Rate Limiting & DDoS Protection
- [ ] มี rate limiting
- [ ] มี request size limits
- [ ] มี timeout configuration

### Error Handling & Logging
- [x] มี error handling middleware
- [ ] ไม่เปิดเผย sensitive information
- [ ] มี proper logging
- [ ] มี monitoring

### Database Security
- [x] ใช้ connection pooling
- [x] SSL สำหรับ production
- [x] ใช้ parameterized queries
- [ ] มี query timeout
- [ ] มี connection retry logic

---

## 🎯 Recommended Action Plan

### Phase 1: Critical (ทำทันที)
1. แก้ไข CORS configuration
2. เพิ่ม rate limiting
3. แก้ไข JWT expiration time
4. เพิ่ม helmet.js

### Phase 2: Important (ภายใน 1 สัปดาห์)
5. เพิ่ม input validation middleware
6. ปรับปรุง error handling
7. เพิ่ม file upload validation
8. สร้าง JWT_SECRET ใหม่ที่ปลอดภัย

### Phase 3: Enhancement (ภายใน 1 เดือน)
9. เพิ่ม refresh token mechanism
10. เพิ่ม password reset functionality
11. เพิ่ม account lockout
12. เพิ่ม logging และ monitoring

---

## 📊 Security Score Breakdown

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| Authentication & Authorization | 8/10 | 20% | 1.6 |
| SQL Injection Protection | 10/10 | 15% | 1.5 |
| CORS Configuration | 4/10 | 15% | 0.6 |
| Rate Limiting | 2/10 | 10% | 0.2 |
| Input Validation | 6/10 | 10% | 0.6 |
| Security Headers | 2/10 | 10% | 0.2 |
| Error Handling | 6/10 | 5% | 0.3 |
| File Upload Security | 6/10 | 5% | 0.3 |
| Environment Variables | 8/10 | 5% | 0.4 |
| Database Security | 8/10 | 5% | 0.4 |
| **Total** | | **100%** | **6.1/10** |

**Overall Security Score:** 6.1/10 ⚠️

---

## 📞 Contact & Support

หากต้องการความช่วยเหลือในการแก้ไขปัญหาความปลอดภัย:
1. อ่านเอกสารเพิ่มเติมที่ OWASP Top 10
2. ใช้ tools เช่น npm audit, Snyk
3. พิจารณา penetration testing

---

**Report Generated:** 2025-12-10  
**Next Review:** แนะนำทุก 3 เดือน
