terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State is local for now. To migrate to a remote backend (S3 + DynamoDB
  # for locking), uncomment and run `terraform init -migrate-state`:
  #
  # backend "s3" {
  #   bucket         = "your-tfstate-bucket"
  #   key            = "volatility-analysis/pdf-import.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "your-tfstate-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project    = "volatility-analysis"
      component  = "pdf-import"
      managed_by = "terraform"
    }
  }
}
