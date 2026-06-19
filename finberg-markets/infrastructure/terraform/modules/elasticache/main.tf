terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.65" } }
}

variable "name"              { type = string }
variable "vpc_id"            { type = string }
variable "subnet_ids"        { type = list(string) }
variable "node_type"         { type = string }
variable "num_node_groups"   { type = number, default = 3 }
variable "replicas_per_node" { type = number, default = 1 }
variable "engine_version"    { type = string, default = "7.4" }

resource "aws_elasticache_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id        = var.name
  description                 = "FINBERG cache / sessions / rate limiting"
  engine                      = "redis"
  engine_version              = var.engine_version
  node_type                   = var.node_type
  num_node_groups             = var.num_node_groups
  replicas_per_node_group     = var.replicas_per_node
  parameter_group_name        = "default.redis7.cluster.on"
  port                        = 6379
  subnet_group_name           = aws_elasticache_subnet_group.this.name
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  snapshot_retention_limit    = 7
  snapshot_window             = "02:00-03:00"
}

output "endpoint" { value = aws_elasticache_replication_group.this.configuration_endpoint_address }
