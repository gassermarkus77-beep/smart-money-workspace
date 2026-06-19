terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.65" } }
}

variable "cluster_name"    { type = string }
variable "cluster_version" { type = string }
variable "vpc_id"          { type = string }
variable "subnet_ids"      { type = list(string) }
variable "node_groups"     { type = any }

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name                   = var.cluster_name
  cluster_version                = var.cluster_version
  cluster_endpoint_public_access = true
  vpc_id                         = var.vpc_id
  subnet_ids                     = var.subnet_ids

  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }
    aws-efs-csi-driver     = { most_recent = true }
  }

  eks_managed_node_groups = {
    for k, v in var.node_groups : k => {
      instance_types = v.instance_types
      min_size       = v.min_size
      max_size       = v.max_size
      desired_size   = v.desired_size
      capacity_type  = "ON_DEMAND"
      taints         = try(v.taints, [])
      labels         = try(v.labels, {})
    }
  }

  enable_irsa = true
}

output "cluster_endpoint"          { value = module.eks.cluster_endpoint }
output "cluster_security_group_id" { value = module.eks.cluster_security_group_id }
output "oidc_provider_arn"         { value = module.eks.oidc_provider_arn }
