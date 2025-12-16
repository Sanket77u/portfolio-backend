// connect to AivaDB

const fs = require("fs");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    ca: process.env.CERTIFICATE,
  },
});

pool.on("error", (err) => {
  console.error("⚠️ Unexpected DB error:", err.message);
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW() as now");
    console.log("✅ PostgreSQL Connected at", res.rows[0].now.toLocaleTimeString(), "\n");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message, "\n");
  }
})();

module.exports = pool;