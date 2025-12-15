# Kubernetes cluster config
output "cluster_id" {
  description = "Kubernetes cluster ID"
  value       = digitalocean_kubernetes_cluster.scriptumai.id
}

output "cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = digitalocean_kubernetes_cluster.scriptumai.endpoint
}

output "kubeconfig" {
  description = "Kubernetes config for kubectl"
  value       = digitalocean_kubernetes_cluster.scriptumai.kube_config[0].raw_config
  sensitive   = true
}

# Database connection details
output "db_host" {
  description = "Database host"
  value       = digitalocean_database_cluster.scriptumai_db.host
}

output "db_port" {
  description = "Database port"
  value       = digitalocean_database_cluster.scriptumai_db.port
}

output "db_name" {
  description = "Database name"
  value       = digitalocean_database_db.scriptumai_database.name
}

output "db_user" {
  description = "Database user"
  value       = digitalocean_database_user.scriptumai_user.name
}

output "db_password" {
  description = "Database password"
  value       = digitalocean_database_user.scriptumai_user.password
  sensitive   = true
}

output "db_connection_string" {
  description = "Full PostgreSQL connection string"
  value       = "postgresql://${digitalocean_database_user.scriptumai_user.name}:${digitalocean_database_user.scriptumai_user.password}@${digitalocean_database_cluster.scriptumai_db.host}:${digitalocean_database_cluster.scriptumai_db.port}/${digitalocean_database_db.scriptumai_database.name}?sslmode=require"
  sensitive   = true
}
