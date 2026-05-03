resource "aws_ecr_repository" "extract" {
  name                 = "${var.project_name}-pdf-extract"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Cap the number of stored images so old builds don't accumulate.
resource "aws_ecr_lifecycle_policy" "extract" {
  repository = aws_ecr_repository.extract.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the 10 most recent images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
