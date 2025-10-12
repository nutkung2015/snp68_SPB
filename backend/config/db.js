// backend/config/db.js
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1", // prefer IPv4 to avoid ::1 binding issues
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sieng_puen_ban_1",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify one connection at startup (optional)
db.getConnection((err, conn) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL database");
    conn.release();
  }
});

module.exports = db;
