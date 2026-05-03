resource "aws_s3_bucket" "imports" {
  bucket = var.s3_bucket_name
}

resource "aws_s3_bucket_public_access_block" "imports" {
  bucket = aws_s3_bucket.imports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "imports" {
  bucket = aws_s3_bucket.imports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "imports" {
  bucket = aws_s3_bucket.imports.id

  versioning_configuration {
    # PDFs are transient — no need to retain old versions.
    status = "Disabled"
  }
}

# Backstop for orphaned uploads. The Lambda deletes objects after a
# successful extraction; this rule expires anything that survives.
resource "aws_s3_bucket_lifecycle_configuration" "imports" {
  bucket = aws_s3_bucket.imports.id

  rule {
    id     = "expire-imports"
    status = "Enabled"

    filter {
      prefix = "imports/"
    }

    expiration {
      days = var.import_object_ttl_days
    }

    # Don't keep failed multipart uploads around either.
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CORS is required because the browser uploads directly to S3 via the
# pre-signed PUT URL. Even with a signed URL the browser still issues a
# preflight request.
resource "aws_s3_bucket_cors_configuration" "imports" {
  bucket = aws_s3_bucket.imports.id

  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = var.frontend_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Phase 3 will add an aws_s3_bucket_notification resource here that wires
# s3:ObjectCreated:* on the imports/ prefix to the Lambda function. We
# defer it until the Lambda exists.
