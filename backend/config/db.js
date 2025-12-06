// backend/config/db.js
const mysql = require("mysql2");
require("dotenv").config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1", // prefer IPv4 to avoid ::1 binding issues
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sieng_puen_ban_1",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Enable SSL only for production environment
// Local MySQL typically doesn't use SSL
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  };
  console.log('🔒 SSL enabled for production database connection');
}

// Create connection pool
const db = mysql.createPool(dbConfig);

// Verify connection at startup
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err.message);
    console.error("Database config:", {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? 'enabled' : 'disabled'
    });
  } else {
    console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Host: ${dbConfig.host}:${dbConfig.port}`);
    conn.release();
  }
});

module.exports = db;
