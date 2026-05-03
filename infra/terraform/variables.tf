variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for all resources."
}

variable "project_name" {
  type        = string
  default     = "volatility"
  description = "Prefix for resource names. Keep short — used as part of IAM/ECR/Lambda names."
}

variable "s3_bucket_name" {
  type        = string
  description = <<-EOT
    Globally unique S3 bucket name for staging uploaded brokerage PDFs.
    Must be DNS-compliant: lowercase, no underscores. Suggestion:
    "volatility-pdf-imports-<your-name-or-suffix>".
  EOT
}

variable "frontend_origins" {
  type        = list(string)
  default     = ["http://localhost:5173"]
  description = <<-EOT
    Origins allowed to PUT to the S3 bucket via pre-signed URL. The browser
    enforces CORS even with pre-signed URLs, so the deployed frontend's
    origin must be in this list. Add Vercel preview/production URLs here.
  EOT
}

variable "import_object_ttl_days" {
  type        = number
  default     = 1
  description = <<-EOT
    Lifecycle expiration for objects under imports/. S3 lifecycle minimum
    is 1 day; the Lambda deletes objects after parsing, so this is only a
    backstop for orphans from failed extractions.
  EOT
}
