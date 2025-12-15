# Microservices Document Management Platform

A document management platform built with microservices architecture, deployed on DigitalOcean Kubernetes.

## 🎯 Project Overview

Multi-tenant document management system designed to demonstrate real-world microservices patterns, event-driven architecture, and cloud deployment. The platform allows organizations to register, manage documents, invite users, and receive notifications through a fully asynchronous event system.

### System Context

![System Context View](docs/images/diagrama-contexto.png)

### Key Features

- **Multi-tenant Architecture** - Complete data isolation per organization
- **Event-Driven Communication** - RabbitMQ-based async messaging
- **JWT Authentication** - Secure token-based access control
- **Document Management** - Upload, version, and organize documents
- **User Invitations** - Email notifications via async events
- **Cloud Native** - Kubernetes orchestration on DigitalOcean
- **Scalable Design** - Independent microservice deployment

## 🏗️ Architecture

#### Synchronous Communication

![Synchronous Communication](docs/images/diagrama-comunicacao-sincrona.png)

### Microservices Breakdown

| Service                  | Technology      | Responsibility                   |
| ------------------------ | --------------- | -------------------------------- |
| **Auth Service**         | Node.js/Express | User authentication, JWT tokens  |
| **Organization Service** | NestJS          | Tenant management, invitations   |
| **Document Service**     | NestJS          | Document CRUD, metadata          |
| **Notification Service** | Node.js/Express | Email notifications via RabbitMQ |

## 🔄 Event-Driven Flow

#### Asynchronous Communication

![Asynchronous Communication](docs/images/diagrama-comunicacao-assincrona.png)

![Async Invite Flow](docs/images/async-invite-rabbitmq.png)

## 🛠️ Technology Stack

### Backend Services

- **Node.js 20** - Runtime environment
- **NestJS 11** - Progressive Node.js framework
- **Express.js** - Lightweight HTTP server

### Data & Messaging

- **PostgreSQL 16** - Relational database
- **RabbitMQ 3** - Message broker
- **Prisma** - ORM for database access
- **Drizzle** - Query builder

### Infrastructure

- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **DigitalOcean** - Cloud provider
- **MinIO/Spaces** - Object storage

### Security & API

- **JWT** - Authentication tokens
- **Nginx** - API Gateway
- **CORS** - Cross-origin requests
- **Rate Limiting** - DDoS protection

## 📦 Installation & Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- RabbitMQ 3
- kubectl & kubeconfig

### Test with Postman

1. Import collection: `postman/ScriptumAI_Microservices.postman_collection.json`
2. Import environment: `postman/ScriptumAI_Environment.postman_environment.json`
3. Update `baseUrl` to `http://localhost`
4. Run requests from "Initial Setup" folder

### Infrastructure as Code

Uses Terraform to provision:

- DigitalOcean Kubernetes Cluster
- PostgreSQL Managed Database
- LoadBalancer for API Gateway
- Persistent volumes for data

```bash
cd terraform
terraform plan
terraform apply
```

## 📊 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh access token

### Organizations

- `POST /api/organizations/register` - Create first org (bootstrap)
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization

### Documents

- `POST /api/documents` - Create document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document

### Invites

- `POST /api/invites` - Send user invitation
- `GET /api/invites` - List invitations
- `PATCH /api/invites/:id/accept` - Accept invitation

### Notifications

- `POST /api/notifications/send` - Send notification
- `GET /api/notifications/user/:userId` - Get user notifications

## 🔐 Security Architecture

### API Gateway Layer

- Rate limiting (10 req/sec per IP)
- Request logging & monitoring
- SSL/TLS termination
- Network topology hiding

### Service Layer

- JWT token validation on every request
- Role-based access control (RBAC)
- organizationId validation (multi-tenant)
- Request signing

### Data Layer

- Database-per-service pattern
- Encrypted connections (SSL)
- Credentials in Kubernetes Secrets
- No hardcoded secrets in code

### Secret Management

- Kubernetes Secrets for production
- .env files for local development
- Terraform variables for infrastructure
- GitHub token rotation

## 🧪 Testing

### Unit Tests

```bash
cd services/service-name
npm test
```

### Integration Tests

```bash
npm run test:e2e
```

### Load Testing (Optional)

```bash
# Using k6 or locust for performance testing
k6 run performance-test.js
```

## 🔄 CI/CD Pipeline

Automated workflow with GitHub Actions:

1. Build Docker images (multi-platform)
2. Run tests
3. Push to GitHub Container Registry
4. Deploy to Kubernetes

```yaml
# Example workflow in .github/workflows
- Build & Test
- Push to GHCR
- Update Kubernetes deployments
```

### Git Branch Strategy

![Branch Structure](docs/images/Estrutura_Branches.jpeg)

## 📚 Project Structure

```
scriptumai-microservices-architecture/
├── services/
│   ├── api-gateway/              # Nginx reverse proxy
│   ├── authentication-service/   # Auth microservice
│   ├── organization-service/     # Organization & invites
│   ├── document-service/         # Document management
│   └── notification-service/     # Email notifications
├── k8s/                          # Kubernetes manifests
│   ├── namespace.yaml
│   ├── config.yaml              # ConfigMaps & Secrets
│   └── *.yaml                   # Service deployments
├── terraform/                    # Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── postman/                      # API testing collection
├── infra/                        # Database initialization scripts
└── docker-compose.yaml           # Local development setup orchestrator
```

### Design Patterns Used

- **Database-per-Service** - Data isolation
- **API Gateway** - Single entry point
- **Event Sourcing** - Async communication

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👤 Author

**João Vieira**

- GitHub: [@joaovieirapt17](https://github.com/joaovieirapt17)
- Project developed as part of Master's in Computer Engineering
