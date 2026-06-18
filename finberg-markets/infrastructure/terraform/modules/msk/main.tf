terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.65" } }
}

variable "name"                      { type = string }
variable "vpc_id"                    { type = string }
variable "subnet_ids"                { type = list(string) }
variable "kafka_version"             { type = string }
variable "broker_node_instance_type" { type = string }
variable "number_of_broker_nodes"    { type = number, default = 3 }
variable "ebs_volume_size"           { type = number, default = 500 }

resource "aws_security_group" "msk" {
  name        = "${var.name}-msk-sg"
  description = "MSK brokers"
  vpc_id      = var.vpc_id
  ingress { from_port = 9092, to_port = 9098, protocol = "tcp", self = true }
  egress  { from_port = 0,    to_port = 0,    protocol = "-1", cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_msk_cluster" "this" {
  cluster_name           = var.name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = var.broker_node_instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk.id]
    storage_info {
      ebs_storage_info { volume_size = var.ebs_volume_size }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
}

output "bootstrap_brokers" { value = aws_msk_cluster.this.bootstrap_brokers_tls }
