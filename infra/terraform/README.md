# PDF-Import Infrastructure

Terraform for the AWS side of the brokerage-PDF holdings import feature
(see `features/FEATURE-portfolio-pdf-import.md`). Deploys to **us-east-1**.

## What this creates (Phase 2)

- **S3 bucket** for staging uploaded PDFs
  - Server-side encryption (AES256)
  - Public access fully blocked
  - Lifecycle rule expiring `imports/*` after 1 day (backstop for orphans)
  - CORS for browser PUTs from your frontend origins
- **ECR repository** for the Lambda container image (Phase 3 will push to it)
- **IAM user** for the Vercel backend with a single permission: `s3:PutObject` on `imports/*`
  - Access key + secret are output and feed into Vercel env vars

## What this does *not* create yet

- The Lambda function itself, its execution role, the CloudWatch log group, and the S3→Lambda notification — all deferred to Phase 3 because the Lambda needs a container image to exist before `terraform apply` can succeed, and we don't have that image until Phase 3 ships.

## Prerequisites

- Terraform 1.6+
- AWS credentials with permissions to create S3, ECR, and IAM resources (admin-equivalent in this account, ideally an account dedicated to this project)
- A globally unique S3 bucket name in mind

## First-time apply

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars — set s3_bucket_name and add your Vercel origin
terraform init
terraform plan -out plan.out
terraform apply plan.out
```

After apply, retrieve the secret access key (it's the only place this value is shown — Terraform stores it in state but won't print it again):

```bash
terraform output -raw vercel_uploader_secret_access_key
```

## Wiring outputs into Vercel

Add to **Vercel → Project Settings → Environment Variables** (Preview + Production):

| Vercel env var          | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `AWS_REGION`            | `us-east-1`                                                    |
| `AWS_ACCESS_KEY_ID`     | `terraform output -raw vercel_uploader_access_key_id`          |
| `AWS_SECRET_ACCESS_KEY` | `terraform output -raw vercel_uploader_secret_access_key`      |
| `S3_BUCKET`             | `terraform output -raw s3_bucket_name`                         |

## State

Local state by default — fine for a one-person project. To migrate to a remote backend (S3 + DynamoDB lock table), uncomment the `backend "s3"` block in `main.tf`, create those resources out-of-band, and run `terraform init -migrate-state`.

## Cost expectation

All resources here sit comfortably in the AWS free tier for this app's expected usage (one statement per user per month):

- S3: a few KB stored for ~1 minute per upload
- ECR: small image, infrequent pulls
- IAM: free
- CloudWatch (added in Phase 3): well under 5GB/month

External cost is **LlamaCloud** at roughly $0.03/page (~$0.15 per 5-page statement).

## Destroying

```bash
terraform destroy
```

The S3 bucket must be empty before destroy succeeds. Either wait for the lifecycle rule to expire any leftover objects (max 1 day) or delete the bucket contents manually first.

## Adding a new Vercel preview origin

Add the new URL to `frontend_origins` in `terraform.tfvars` and `terraform apply`. The change only updates the bucket's CORS configuration — no other resources are touched.
