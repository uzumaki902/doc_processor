const pdfParse = require("pdf-parse");
const db = require("./db");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function processDocument(jobId, buffer) {
  try {
    console.log("Processing:", jobId);

    const pdf = await pdfParse(buffer);

    if (!pdf.text || pdf.text.trim().length < 20) {
      throw new Error("Could not extract text — PDF appears to be scanned");
    }

    const start = Date.now();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
Return ONLY JSON with:
document_type, confidence, document_date, total_amount, counterparty.
Use null if missing.
          `,
        },
        {
          role: "user",
          content: pdf.text.slice(0, 6000),
        },
      ],
      response_format: { type: "json_object" },
    });

    const processingTime = Date.now() - start;

    let result;
    try {
      result = JSON.parse(completion.choices[0].message.content);
    } catch {
      throw new Error("Invalid JSON from LLM");
    }

    const extractedFields = {
      document_date: result.document_date ?? null,
      total_amount: result.total_amount ?? null,
      counterparty: result.counterparty ?? null,
    };

    db.run(
      `UPDATE jobs SET
        status = 'complete',
        document_type = ?,
        confidence = ?,
        extracted_fields = ?,
        page_count = ?,
        processing_time_ms = ?,
        error = null
       WHERE job_id = ?`,
      [
        result.document_type ?? null,
        result.confidence ?? null,
        JSON.stringify(extractedFields),
        pdf.numpages,
        processingTime,
        jobId,
      ],
    );

    console.log("Done:", jobId);
  } catch (err) {
    console.error("Failed:", jobId, err.message);

    db.run(
      `UPDATE jobs SET
        status = 'failed',
        document_type = null,
        confidence = null,
        extracted_fields = ?,
        page_count = null,
        processing_time_ms = null,
        error = ?
       WHERE job_id = ?`,
      [
        JSON.stringify({
          document_date: null,
          total_amount: null,
          counterparty: null,
        }),
        err.message,
        jobId,
      ],
    );
  }
}

module.exports = { processDocument };
