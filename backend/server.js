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

// Security Middleware
app.use(helmet());

// Logging Middleware
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://snp68-spb.onrender.com']
    : [
      'http://localhost:8081',   // Expo Dev Server
      'http://localhost:4200',   // Angular Web Backoffice
      'http://127.0.0.1:5000'    // Backend Local
    ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit each IP to 5 login requests per `window`
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Test Native Backend API" });
});

// Posts routes
app.use("/api/posts", require("./routes/posts"));

// Mock News routes
app.use("/api/mock/news", require("./routes/mockNews"));

// Announcements routes
app.use("/api/announcements", require("./routes/announcements"));

// Auth routes
app.use("/api/auth", authRoutes);

const unitRoutes = require("./routes/units");
app.use("/api/units", unitRoutes);

// Project routes
app.use("/api", projectRoutes); // Changed from "/api/projects" to "/api" to support /api/project-memberships
app.use("/api/project_invitations", require("./routes/project_invitations"));

// Repairs routes
app.use("/api/repairs", require("./routes/repairs"));

// Juristic routes
app.use("/api/juristic", require("./routes/juristicRoutes"));


app.use(
  "/api/project-customizations",
  require("./routes/projectCustomizations")
);

// Error handling middleware
app.use(require("./middleware/errorMiddleware"));

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
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
