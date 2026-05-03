# Feature: Import Portfolio Holdings from Brokerage PDF

## Overview

Users can upload a brokerage statement PDF (e.g. Wells Fargo Advisors, Fidelity NetBenefits 401(k)) and have the holdings extracted automatically into a leaf portfolio. Extraction happens out-of-band on AWS Lambda using LlamaExtract; the frontend polls a Vercel-hosted status endpoint for the result.

## Goals

- One-click import of holdings from a brokerage statement
- Robust across brokerage formats (no per-broker regex)
- No long-running compute on Vercel — keep the deployment on the free tier
- The PDF is never persisted: it lives in S3 only long enough for Lambda to read it, then is deleted
- Auth-gated; users only see their own imports

## Non-goals

- Parsing transaction history (only current positions)
- Bond/options/derivatives (drop them with a warning)
- Cash and money-market positions (drop them with a warning)
- Real-time imports (monthly cadence assumed)

## Architecture

```
Frontend                 Vercel                   AWS                      LlamaCloud
   │                       │                       │                          │
   │ 1. POST /init ───────▶│                       │                          │
   │                       │ INSERT pdf_imports    │                          │
   │                       │ row (status=pending)  │                          │
   │ ◀── job_id +          │                       │                          │
   │     pre-signed PUT    │                       │                          │
   │                                                                          │
   │ 2. PUT pdf ──────────────────────────────────▶│ S3: imports/{job_id}.pdf │
   │                                                │  └─ S3 ObjectCreated ──┐│
   │                                                │                        ▼│
   │                                                │                   Lambda│
   │                                                │  status=processing      │
   │                                                │  POST extract ─────────▶│
   │                                                │  ◀── structured holdings│
   │                                                │  validate, normalize    │
   │                                                │  UPDATE pdf_imports     │
   │                                                │  status=completed       │
   │                                                │  DELETE s3 object       │
   │ 3. GET /status (poll q15s)                                               │
   │   ────────────────▶ │ SELECT pdf_imports                                 │
   │ ◀── pending|done    │                                                    │
   │                                                                          │
   │ 4. user confirms preview → existing PUT /api/portfolios/{id}/holdings    │
```

## Data Model

New table in Neon Postgres:

```sql
CREATE TABLE pdf_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
    result JSONB,           -- {holdings: [{ticker, shares}], warnings: [...]}
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pdf_imports_user ON pdf_imports(user_email);
CREATE INDEX idx_pdf_imports_portfolio ON pdf_imports(portfolio_id);
```

`init_schema()` in `backend/database.py` is extended to create this table and its indexes on first boot.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/portfolios/{id}/import-pdf/init` | Create import job; return `{job_id, upload_url}` |
| GET  | `/api/portfolios/{id}/import-pdf/{job_id}` | Get status and (when complete) extracted holdings |

Existing `PUT /api/portfolios/{id}/holdings` is reused to commit the user's confirmed holdings — no new mutation endpoint needed for the actual save.

## AWS Resources (Terraform, us-east-1)

- **S3 bucket** `volatility-pdf-imports` (block public access, server-side encryption, 24h lifecycle rule on the `imports/` prefix)
- **Lambda function** `volatility-pdf-extract` — Python 3.12 container image (LlamaCloud + asyncpg easily exceed the 250MB zip limit)
  - Trigger: S3 ObjectCreated on `imports/`
  - Env: `LLAMA_CLOUD_API_KEY`, `DATABASE_URL`, `S3_BUCKET`
  - Execution role: `s3:GetObject` + `s3:DeleteObject` on the `imports/` prefix only, plus `logs:*` for CloudWatch
- **ECR repository** for the Lambda container image
- **IAM user** for Vercel — only `s3:PutObject` on `imports/*` (used for signing PUT URLs)
- **CloudWatch log group** with 14-day retention

All defined in `infra/terraform/`. Region: `us-east-1`.

## Frontend

- New "Import from PDF" button on the leaf-portfolio holdings UI
- File picker (PDF only, max 10MB client-side guard)
- Polling hook (every 15s, max 5 min) on the status endpoint
- Preview modal: detected holdings table + warnings list + Replace / Merge / Cancel buttons
- One-line privacy disclosure: *"Your statement is sent to LlamaParse for parsing and is not retained."*

## Backend

- New module `backend/pdf_import.py` — `init_import()`, `get_import_status()`
- Boto3 in `backend/requirements.txt` and `api/requirements.txt` for pre-signed URL signing
- Vercel env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1`, `S3_BUCKET=volatility-pdf-imports`

## Lambda

- Separate `lambda/` directory at the repo root
- `lambda/handler.py` — S3 event handler
- `lambda/Dockerfile` — based on `public.ecr.aws/lambda/python:3.12`
- `lambda/requirements.txt` — `llama-cloud-services`, `asyncpg`, `boto3`
- Schema for LlamaExtract: `{holdings: [{ticker: str, description: str, shares: float, account_type: str}]}`

## Validation Rules (server-side, both Lambda and confirm step)

- Drop rows where `shares <= 0`
- Drop cash/money-market entries (description match: `^cash`, `money market`, `FCASH`, `SWVXX`, etc.)
- Uppercase the ticker
- Strip class-suffix annotations like ` (Class A)` from descriptions but keep ticker as-is
- Reject the whole import if zero valid rows remain

## Test Plan

- **Fixtures**: synthetic Wells Fargo brokerage and Fidelity NetBenefits 401(k) PDFs in `backend/tests/fixtures/`, generated by a checked-in script. No real statements are committed.
- **Backend**: unit tests for `init_import` (creates row, returns signed URL), `get_import_status` (returns each state), validation logic. Mock boto3 with `moto` or simple stubs.
- **Lambda**: unit tests for handler with mocked S3 + LlamaExtract clients, using the fixture PDFs.
- **Frontend**: button → file picker → polling → preview → replace/merge flows, all with mocked endpoints.
- **End-to-end**: optional, against a real Neon test database and a recorded LlamaExtract response.

## Open Risks

- **LlamaExtract response time**: typical 10–60s for a 5–10 page statement; Lambda timeout set to 5 min as a safety margin.
- **Format drift**: if a brokerage redesigns their statement, LlamaExtract should still adapt because we describe the schema, not the layout. But brand-new formats may need schema tuning.
- **Cost**: LlamaCloud charges per page (~$0.03/page). At one statement/month per user, negligible.
- **Cleanup of orphaned S3 objects**: lifecycle rule (24h) handles failures.

## Cost Estimate (per statement)

- LlamaCloud: ~$0.15 (5 pages)
- Lambda: free tier
- S3: free tier (object exists for ~1 minute)
- Neon: free tier
- Total: **~$0.15/statement**

## Phased Delivery

1. **Phase 1** — fixtures + feature file (this PR)
2. **Phase 2** — Terraform infra (S3, Lambda placeholder, IAM, ECR), applied to AWS
3. **Phase 3** — Lambda code with mocked LlamaExtract, unit tests
4. **Phase 4** — backend endpoints + `pdf_imports` schema, unit tests
5. **Phase 5** — frontend UI + polling + preview, unit tests
6. **Phase 6** — wire LlamaExtract for real, end-to-end test against the synthetic PDFs
