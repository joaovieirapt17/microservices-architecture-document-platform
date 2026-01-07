# Cloud Authentication Microservice

A scalable authentication microservice built with Node.js, deployed on Kubernetes with full CI/CD automation. Developed as part of my Master's in Computer Engineering to demonstrate cloud-native patterns and DevOps practices.

## Overview

This project implements a production-ready authentication service with:

- JWT-based authentication
- Kubernetes orchestration with auto-scaling
- Infrastructure as Code using Terraform
- Full CI/CD pipeline with GitHub Actions
- Monitoring with Prometheus and Grafana
- Automated semantic versioning

The service is designed to scale horizontally based on CPU and memory metrics, with health checks and observability built in from the start.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Load Balancer                      │
└───────────────────┬─────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
┌───▼────┐  ┌──────────┐  ┌───────▼────┐
│ API    │  │   API    │  │    API     │
│ Pod 1  │  │  Pod 2   │  │   Pod N    │
└───┬────┘  └────┬─────┘  └────┬───────┘
    │            │             │
    └────────────┴─────────────┘
                 │
         ┌───────▼────────┐
         │   PostgreSQL   │
         │  (Stateful)    │
         └────────────────┘
```

Stateless API pods scale independently from the database, allowing the system to handle traffic spikes efficiently.

## Tech Stack

**Backend:** Node.js, Express.js, JWT  
**Database:** PostgreSQL  
**DevOps:** Docker, Kubernetes, Terraform  
**CI/CD:** GitHub Actions  
**Monitoring:** Prometheus, Grafana, K8s Metrics Server

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- kubectl (for Kubernetes deployment)

### Local Development

Clone and install dependencies:

```bash
git clone <repository-url>
cd cloud-auth-service/API
npm install
```

Create a `.env` file:

```env
PORT=3001
HOST=0.0.0.0
SQL_SERVER=localhost
SQL_PORT=5432
SQL_DATABASE=cloudauth_db
SQL_USER=postgres
SQL_PASSWORD=postgres
SECRET_TOKEN=change-this-in-production
```

Start the database and run the API:

```bash
docker compose up -d postgres
npm run dev
```

Access the API:
- API: http://localhost:3001
- Swagger UI: http://localhost:3001/api-docs
- Health: http://localhost:3001/health

### Testing

```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
```

## Deployment

### Docker

Build and run with Docker Compose:

```bash
docker compose up -d
docker compose logs -f api
```

### Kubernetes

Deploy to your cluster:

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get hpa
```

Required secrets:

```bash
kubectl create secret generic scriptumai-db-secret \
  --from-literal=host=your-db-host \
  --from-literal=port=5432 \
  --from-literal=database=cloudauth_db \
  --from-literal=user=postgres \
  --from-literal=password=your-password \
  --from-literal=jwt_secret=your-jwt-secret
```

### Auto-scaling

The HPA (Horizontal Pod Autoscaler) is configured to scale between 2-10 replicas based on:
- CPU: 70% threshold
- Memory: 80% threshold

Monitor scaling in real-time:

```bash
kubectl get hpa -w
```

### Terraform

Provision infrastructure:

```bash
terraform init
terraform plan
terraform apply
```

This creates the Kubernetes cluster, load balancer, persistent volumes, and monitoring stack.

## CI/CD Pipeline

The project uses GitHub Actions for automated workflows:

**CI Pipeline** (runs on PRs and pushes):
- Linting and code quality checks
- Unit and integration tests
- Docker build

**Release Pipeline**:
- Semantic versioning based on conventional commits
- Automatic CHANGELOG generation
- GitHub releases
- Container image publishing to GHCR

## Monitoring

### Health Checks

- **Liveness probe** (`GET /health`): Checks database connectivity
- **Readiness probe** (`GET /health`): Verifies the API is ready

### Metrics

Grafana dashboard included (`grafana-dashboard.json`) with:
- Request rate and latency
- CPU and memory usage
- Pod status and scaling behavior

### Load Testing

Run performance tests with K6:

```bash
k6 run k6-load-test.js
```

## API Endpoints

### Authentication

```
POST   /api/authRegister   - Register new user
POST   /api/authLogin      - Login and get JWT token
POST   /api/authLogout     - Logout (requires auth)
```

### Users

```
GET    /api/listUsers      - List all users (admin only)
```

### System

```
GET    /health             - Health check
GET    /api-docs           - Swagger documentation
```

Full API documentation is available at `/api-docs` when the server is running.

## Project Structure

```
.
├── API/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth & validation
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── tests/              # Unit & integration tests
│   └── Dockerfile
├── k8s/                    # Kubernetes manifests
├── terraform/              # Infrastructure as Code
├── .github/workflows/      # CI/CD pipelines
└── docker-compose.yml
```

## Security

- JWT tokens with configurable expiration
- HTTPS enforcement in production
- Kubernetes Secrets for sensitive data
- Network policies for pod isolation
- RBAC configured in the cluster

## Academic Context

Developed for the Cloud Computing Systems course as part of my Master's in Computer Engineering. The project demonstrates:

- Cloud-native application design
- Container orchestration with Kubernetes
- Infrastructure as Code practices
- CI/CD automation
- Observability and monitoring
- Auto-scaling based on metrics

## License

MIT License

## Author

João Vieira  
GitHub: [@joaovieirapt17](https://github.com/joaovieirapt17)  
LinkedIn: [João Vieira](https://www.linkedin.com/in/joao-vieira17/)
