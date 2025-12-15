# DigitalOcean Variables
variable "do_token" {
  description = "DigitalOcean API Token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "ams3" # Amsterdam
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "scriptumai-cluster"
}

variable "node_size" {
  description = "Droplet size for Kubernetes nodes"
  type        = string
  default     = "s-2vcpu-2gb"
}

variable "node_count" {
  description = "Number of nodes in the cluster"
  type        = number
  default     = 2 # Minimum for HA
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "ScriptumAI"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  default     = "scriptumai"
}

variable "db_size" {
  description = "PostgreSQL database size"
  type        = string
  default     = "db-s-1vcpu-1gb" # 1 vCPU, 1GB RAM, 10GB disk
}

variable "allowed_ip" {
  description = "Your IP address to allow database access (for migrations and debugging)"
  type        = string
  default     = "89.155.111.107" 
}

variable "spaces_bucket_name" {
  description = "Spaces bucket name for document storage"
  type        = string
  default     = "scriptumai-documents"
}

variable "jwt_secret" {
  description = "JWT Secret for authentication"
  type        = string
  sensitive   = true
}

variable "rabbitmq_password" {
  description = "RabbitMQ password"
  type        = string
  sensitive   = true
}

variable "spaces_access_key" {
  description = "DigitalOcean Spaces Access Key ID"
  type        = string
  sensitive   = true
}

variable "spaces_secret_key" {
  description = "DigitalOcean Spaces Secret Access Key"
  type        = string
  sensitive   = true
}
