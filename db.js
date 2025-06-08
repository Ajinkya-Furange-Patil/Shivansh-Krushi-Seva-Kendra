require("dotenv").config(); // ← add this at the top of db.js just for testing
// db.js
const mysql = require("mysql2/promise"); // promise wrapper version

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // max concurrent connections
  queueLimit: 0, // unlimited queue
});

db.getConnection()
  .then((conn) => {
    console.log("✅ Connected to MySQL Database via pool");
    conn.release(); // release back to pool
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  });

module.exports = db;
console.log("✅ db.js loaded successfully");
