const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.DB_PATH || "jobs.db";

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  } else {
    console.log(`Connected to SQLite: ${DB_PATH}`);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'processing',
      document_type TEXT,
      confidence REAL,
      extracted_fields TEXT,
      page_count INTEGER,
      processing_time_ms INTEGER,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
