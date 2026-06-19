terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.65" } }
}

variable "identifier"              { type = string }
variable "engine_version"          { type = string }
variable "vpc_id"                  { type = string }
variable "subnet_ids"              { type = list(string) }
variable "instance_class"          { type = string }
variable "instance_count"          { type = number, default = 2 }
variable "backup_retention_period" { type = number, default = 14 }
variable "performance_insights"    { type = bool, default = true }
variable "deletion_protection"     { type = bool, default = true }

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnets"
  subnet_ids = var.subnet_ids
}

resource "random_password" "master" {
  length  = 32
  special = false
}

resource "aws_rds_cluster" "this" {
  cluster_identifier       = var.identifier
  engine                   = "aurora-postgresql"
  engine_version           = var.engine_version
  database_name            = "finberg"
  master_username          = "finberg_admin"
  master_password          = random_password.master.result
  db_subnet_group_name     = aws_db_subnet_group.this.name
  storage_encrypted        = true
  deletion_protection      = var.deletion_protection
  backup_retention_period  = var.backup_retention_period
  preferred_backup_window  = "01:00-03:00"
  apply_immediately        = false
  enabled_cloudwatch_logs_exports = ["postgresql"]
}

resource "aws_rds_cluster_instance" "instances" {
  count                = var.instance_count
  identifier           = "${var.identifier}-${count.index}"
  cluster_identifier   = aws_rds_cluster.this.id
  instance_class       = var.instance_class
  engine               = aws_rds_cluster.this.engine
  engine_version       = aws_rds_cluster.this.engine_version
  performance_insights_enabled = var.performance_insights
  performance_insights_retention_period = 7
}

resource "aws_secretsmanager_secret" "master" {
  name = "${var.identifier}/master-password"
}
resource "aws_secretsmanager_secret_version" "master" {
  secret_id     = aws_secretsmanager_secret.master.id
  secret_string = jsonencode({ username = aws_rds_cluster.this.master_username, password = random_password.master.result })
}

output "endpoint"        { value = aws_rds_cluster.this.endpoint, sensitive = true }
output "reader_endpoint" { value = aws_rds_cluster.this.reader_endpoint, sensitive = true }
output "secret_arn"      { value = aws_secretsmanager_secret.master.arn }
