# IAM user used by the Vercel backend to issue pre-signed PUT URLs to S3.
#
# Long-lived access keys are not the prettiest pattern; a more polished
# approach is OIDC federation between Vercel and AWS so the backend assumes
# a role per-request without any long-lived secrets. We start with a user
# because it's straightforward and the blast radius is tiny: this principal
# can only PutObject under imports/ in one bucket.
#
# To rotate: `terraform taint aws_iam_access_key.vercel_uploader && terraform apply`,
# then update the new keys in Vercel env vars.

resource "aws_iam_user" "vercel_uploader" {
  name = "${var.project_name}-vercel-uploader"
  path = "/service/"
}

resource "aws_iam_access_key" "vercel_uploader" {
  user = aws_iam_user.vercel_uploader.name
}

resource "aws_iam_user_policy" "vercel_uploader" {
  name = "s3-put-imports"
  user = aws_iam_user.vercel_uploader.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "PutImportObjects"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.imports.arn}/imports/*"
      }
    ]
  })
}
