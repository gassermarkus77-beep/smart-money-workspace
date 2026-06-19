// Thin wrapper over terraform-aws-modules/vpc/aws.
// Defines private + public + database subnets across the supplied AZs.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.65" }
  }
}

variable "name" { type = string }
variable "cidr" { type = string }
variable "azs"  { type = list(string) }
variable "enable_nat_gateway" { type = bool, default = true }
variable "single_nat_gateway" { type = bool, default = false }

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.13"

  name = var.name
  cidr = var.cidr
  azs  = var.azs

  private_subnets  = [for i, _ in var.azs : cidrsubnet(var.cidr, 4, i)]
  public_subnets   = [for i, _ in var.azs : cidrsubnet(var.cidr, 4, i + length(var.azs))]
  database_subnets = [for i, _ in var.azs : cidrsubnet(var.cidr, 4, i + 2 * length(var.azs))]

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
}

output "vpc_id"               { value = module.vpc.vpc_id }
output "private_subnet_ids"   { value = module.vpc.private_subnets }
output "public_subnet_ids"    { value = module.vpc.public_subnets }
output "database_subnet_ids"  { value = module.vpc.database_subnets }
