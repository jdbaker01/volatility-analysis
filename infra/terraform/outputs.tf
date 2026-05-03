output "s3_bucket_name" {
  value       = aws_s3_bucket.imports.bucket
  description = "S3 bucket name. Set as S3_BUCKET in Vercel + Lambda env vars."
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.imports.arn
  description = "ARN — useful for Phase 3 IAM policies."
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.extract.repository_url
  description = "Push the Lambda container image here."
}

output "vercel_uploader_access_key_id" {
  value       = aws_iam_access_key.vercel_uploader.id
  description = "Set as AWS_ACCESS_KEY_ID in Vercel env vars."
}

# Retrieve with: terraform output -raw vercel_uploader_secret_access_key
output "vercel_uploader_secret_access_key" {
  value       = aws_iam_access_key.vercel_uploader.secret
  description = "Set as AWS_SECRET_ACCESS_KEY in Vercel env vars."
  sensitive   = true
}
