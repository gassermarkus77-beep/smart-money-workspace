// ============================================================================
// FINBERG MARKETS — Production AWS Infrastructure
// Frankfurt primary (EU data residency); us-east-1 read replica (Phase 2).
// ============================================================================

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.65" }
  }
  backend "s3" {
    bucket         = "finberg-tf-state-prod"
    key            = "infrastructure/prod.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "finberg-tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-central-1"
  default_tags {
    tags = {
      Project     = "finberg-markets"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# ---- VPC ---------------------------------------------------------------------
module "vpc" {
  source             = "../../modules/vpc"
  name               = "finberg-prod"
  cidr               = "10.10.0.0/16"
  azs                = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
  enable_nat_gateway = true
  single_nat_gateway = false
}

# ---- EKS cluster -------------------------------------------------------------
module "eks" {
  source          = "../../modules/eks"
  cluster_name    = "finberg-prod"
  cluster_version = "1.31"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    general = {
      instance_types = ["m6i.xlarge"]
      min_size       = 4
      max_size       = 40
      desired_size   = 8
    }
    streaming = {
      instance_types = ["c6in.2xlarge"]            # ticks fan-out
      min_size       = 3
      max_size       = 12
      desired_size   = 4
      taints = [{ key = "workload", value = "streaming", effect = "NO_SCHEDULE" }]
    }
    ai = {
      instance_types = ["g5.xlarge"]               # ONNX inference
      min_size       = 1
      max_size       = 6
      desired_size   = 2
      taints = [{ key = "workload", value = "gpu", effect = "NO_SCHEDULE" }]
    }
  }
}

# ---- Aurora (PostgreSQL) -----------------------------------------------------
module "aurora_oltp" {
  source                  = "../../modules/aurora"
  identifier              = "finberg-oltp"
  engine_version          = "16.4"
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  instance_class          = "db.r6g.xlarge"
  instance_count          = 3
  backup_retention_period = 30
  performance_insights    = true
  deletion_protection     = true
}

# ---- ElastiCache Redis Cluster ----------------------------------------------
module "redis" {
  source            = "../../modules/elasticache"
  name              = "finberg-redis"
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  node_type         = "cache.r7g.xlarge"
  num_node_groups   = 3
  replicas_per_node = 1
  engine_version    = "7.4"
}

# ---- MSK Kafka --------------------------------------------------------------
module "kafka" {
  source                    = "../../modules/msk"
  name                      = "finberg-events"
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  kafka_version             = "3.7.x"
  broker_node_instance_type = "kafka.m7g.large"
  number_of_broker_nodes    = 3
  ebs_volume_size           = 1000
}

# ---- S3 buckets -------------------------------------------------------------
resource "aws_s3_bucket" "charts" {
  bucket = "finberg-charts-prod"
}
resource "aws_s3_bucket_versioning" "charts" {
  bucket = aws_s3_bucket.charts.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "charts" {
  bucket = aws_s3_bucket.charts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.charts.id
    }
  }
}
resource "aws_kms_key" "charts" {
  description             = "Encrypt FINBERG chart snapshots + exports"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "aurora_endpoint"  { value = module.aurora_oltp.endpoint, sensitive = true }
output "kafka_bootstrap"  { value = module.kafka.bootstrap_brokers }
