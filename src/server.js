const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const db = require("./db");
const multer = require("multer");
const crypto = require("crypto");
const { processDocument } = require("./processor");

const app = express();
const upload = multer();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Running");
});
app.post("/process-document", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const jobId = crypto.randomUUID();

  try {
    db.prepare(
      `
      INSERT INTO jobs (job_id, status, error)
      VALUES (?, 'processing', null)
    `,
    ).run(jobId);

    res.json({
      job_id: jobId,
      status: "processing",
    });

    setImmediate(() => {
      processDocument(jobId, req.file.buffer).catch((e) =>
        console.error("Worker error:", e.message),
      );
    });
  } catch (err) {
    console.error("Insert failed:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
});

app.get("/result/:job_id", (req, res) => {
  const jobId = req.params.job_id;

  let row;
  try {
    row = db.prepare("SELECT * FROM jobs WHERE job_id = ?").get(jobId);
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({
      job_id: jobId,
      status: "failed",
      document_type: null,
      confidence: null,
      extracted_fields: {
        document_date: null,
        total_amount: null,
        counterparty: null,
      },
      page_count: null,
      processing_time_ms: null,
      error: "Database error",
    });
  }

  if (!row) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (row.status === "processing") {
    return res.json({
      job_id: row.job_id,
      status: "processing",
      document_type: null,
      confidence: null,
      extracted_fields: {
        document_date: null,
        total_amount: null,
        counterparty: null,
      },
      page_count: null,
      processing_time_ms: null,
      error: null,
    });
  }

  if (row.status === "failed") {
    return res.json({
      job_id: row.job_id,
      status: "failed",
      document_type: null,
      confidence: null,
      extracted_fields: {
        document_date: null,
        total_amount: null,
        counterparty: null,
      },
      page_count: null,
      processing_time_ms: null,
      error: row.error,
    });
  }

  let extracted = {
    document_date: null,
    total_amount: null,
    counterparty: null,
  };

  try {
    if (row.extracted_fields) {
      extracted = JSON.parse(row.extracted_fields);
    }
  } catch (e) {
    console.error("Parse issue:", e.message);
  }

  return res.json({
    job_id: row.job_id,
    status: "complete",
    document_type: row.document_type ?? null,
    confidence: row.confidence ?? null,
    extracted_fields: extracted,
    page_count: row.page_count,
    processing_time_ms: row.processing_time_ms,
    error: null,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
