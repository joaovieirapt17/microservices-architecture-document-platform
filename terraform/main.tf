terraform {
  required_version = ">= 1.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.spaces_access_key
  spaces_secret_key = var.spaces_secret_key
}

# Kubernetes Cluster
resource "digitalocean_kubernetes_cluster" "scriptumai" {
  name    = var.cluster_name
  region  = var.region
  version = "1.32.10-do.1" # Latest LTS version verified via DO API

  node_pool {
    name       = "worker-pool"
    size       = var.node_size
    node_count = var.node_count
    auto_scale = true
    min_nodes  = 1
    max_nodes  = 3 # For autoscaling during load
  }

  tags = ["scriptumai", "production"]
}

# PostgreSQL Database
resource "digitalocean_database_cluster" "scriptumai_db" {
  name       = "scriptumai-postgres"
  engine     = "pg"
  version    = "16" # PostgreSQL 16
  size       = var.db_size
  region     = var.region
  node_count = 1 # Single node for cost optimization

  tags = ["scriptumai", "production", "database"]
}

resource "digitalocean_database_db" "scriptumai_database" {
  cluster_id = digitalocean_database_cluster.scriptumai_db.id
  name       = var.db_name
}

resource "digitalocean_database_user" "scriptumai_user" {
  cluster_id = digitalocean_database_cluster.scriptumai_db.id
  name       = var.db_user
}

# Firewall rules to allow access to database
resource "digitalocean_database_firewall" "scriptumai_db_fw" {
  cluster_id = digitalocean_database_cluster.scriptumai_db.id

  # Allow Kubernetes cluster to access database
  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.scriptumai.id
  }

  # Allow local IP to access database (for migrations and debugging)
  rule {
    type  = "ip_addr"
    value = var.allowed_ip
  }
}

# Note: Using GitHub Container Registry (GHCR) for Docker images
# No DigitalOcean Container Registry needed - saves $0-20/month

# Load Balancer (for external traffic to API Gateway)
resource "digitalocean_loadbalancer" "scriptumai_lb" {
  name   = "scriptumai-lb"
  region = var.region

  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"

    target_port     = 80
    target_protocol = "http"
  }

  # HTTPS forwarding will be added later after setting up SSL certificate
  # For now, we'll use HTTP only

  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
  }

  droplet_tag = "scriptumai-api-gateway"
}

# Spaces Object Storage (for document storage - replaces MinIO)
resource "digitalocean_spaces_bucket" "scriptumai_documents" {
  name   = var.spaces_bucket_name
  region = var.region
  acl    = "private"

  versioning {
    enabled = true
  }
}

# Spaces bucket for backups
resource "digitalocean_spaces_bucket" "scriptumai_backups" {
  name   = "${var.spaces_bucket_name}-backups"
  region = var.region
  acl    = "private"
}
