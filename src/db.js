const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "jobs.db";

const db = new Database(DB_PATH);

db.exec(`
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

module.exports = db;
