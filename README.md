# Document Processor API

Simple backend to process PDFs using Groq.

## Endpoints

POST /process-document  
GET /result/:job_id

## Usage

curl -X POST https://doc-processor-gn4e.onrender.com/process-document -F "file=@sample.pdf"

curl https://doc-processor-gn4e.onrender.com/result/<job_id>

## Tech

Node.js, Express, SQLite, Groq
