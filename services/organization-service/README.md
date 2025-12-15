# Organization Service API

A REST API service for managing organizations, memberships, and invitations built with NestJS, Prisma, and PostgreSQL.

## Overview

This service handles organization management including creating organizations, managing member roles, and handling invitation workflows. It implements role-based access control where only owners and admins can perform certain operations.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: class-validator
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Containerization**: Docker

## Project Structure

```
src/
├── app.module.ts           # Root application module
├── main.ts                 # Application entry point
├── organizations/          # Organization management
│   ├── organizations.controller.ts
│   ├── organizations.service.ts
│   ├── organizations.module.ts
│   ├── dto/
│   │   ├── create-organization.dto.ts
│   │   └── update-organization.dto.ts
│   └── entities/
│       └── organization.entity.ts
├── memberships/            # Membership management
│   ├── memberships.controller.ts
│   ├── memberships.service.ts
│   ├── memberships.module.ts
│   ├── dto/
│   │   ├── create-membership.dto.ts
│   │   └── update-membership.dto.ts
│   └── entities/
│       └── membership.entity.ts
├── invites/                # Invitation management
│   ├── invites.controller.ts
│   ├── invites.service.ts
│   ├── invites.module.ts
│   ├── dto/
│   │   ├── create-invite.dto.ts
│   │   └── update-invite.dto.ts
│   └── entities/
│       └── invite.entity.ts
└── prisma/                 # Database configuration
    ├── prisma.module.ts
    └── prisma.service.ts

prisma/
└── schema.prisma           # Database schema definition

test/
├── app.e2e-spec.ts
├── organizations.e2e-spec.ts
├── memberships.e2e-spec.ts
├── invites.e2e-spec.ts
└── full-flow.e2e-spec.ts
```

## Features

### Organizations

- Create, read, update, and delete organizations
- Each organization has a unique subdomain
- Track organization status (active, inactive, pending, suspended)

### Memberships

- Manage organization members with different roles
- **Roles**: owner, admin, member, viewer
- Filter memberships by organization or user
- **Permissions**: Only owners and admins can update or delete memberships

### Invitations

- Create invitations to join organizations
- Token-based invite system with expiration
- **Permissions**: Only owners and admins can create invites (or anyone if organization has no members)
- Automatic membership creation when invite is accepted
- Prevent duplicate invites and memberships

## API Endpoints

All endpoints are prefixed with `/api`

### Organizations

- `POST /api/organizations` - Create a new organization
- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `PATCH /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

### Memberships

- `GET /api/memberships` - Get all memberships (filterable by organizationId, userId)
- `GET /api/memberships/:id` - Get membership by ID
- `PATCH /api/memberships/:id` - Update membership role (requires userId, owner/admin only)
- `DELETE /api/memberships/:id` - Remove member from organization (requires userId, owner/admin only)

### Invites

- `POST /api/invites` - Create invitation (requires userId if org has members, owner/admin only)
- `GET /api/invites` - Get all invites (filterable by organizationId)
- `GET /api/invites/:id` - Get invite by ID
- `PATCH /api/invites/:id/accept` - Accept invitation
- `DELETE /api/invites/:id` - Delete invitation

## Role-Based Permissions

| Action             | Owner | Admin | Member | Viewer |
| ------------------ | ----- | ----- | ------ | ------ |
| Create invites     | ✅    | ✅    | ❌     | ❌     |
| Update memberships | ✅    | ✅    | ❌     | ❌     |
| Delete memberships | ✅    | ✅    | ❌     | ❌     |
| View organization  | ✅    | ✅    | ✅     | ✅     |
| View memberships   | ✅    | ✅    | ✅     | ✅     |

## Database Schema

### Organizations

- `id` (UUID)
- `name` (string)
- `email` (string)
- `subdomain` (string, unique)
- `sector` (string)
- `city` (string)
- `address` (string)
- `contact` (integer)
- `zipCode` (string, format: XXXX-XXX)
- `status` (enum: active, inactive, pending, suspended)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Memberships

- `id` (UUID)
- `organizationId` (UUID, foreign key)
- `userId` (UUID)
- `role` (enum: owner, admin, member, viewer)

### Invites

- `id` (UUID)
- `organizationId` (UUID, foreign key)
- `email` (string)
- `role` (enum: owner, admin, member, viewer)
- `token` (string)
- `expiresAt` (timestamp)
- `createdAt` (timestamp)

## Setup & Installation

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd scriptumai-organiztion-service
```

2. Install dependencies

```bash
npm install
```

3. Start Docker services

```bash
docker-compose up -d
```

4. Run database migrations

```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the application

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## API Documentation

Swagger documentation is available at `http://localhost:3000/api/docs`

## Testing

### Run all tests

```bash
npm run test
```

### Run e2e tests

```bash
npm run test:e2e
```

### Run specific test suite

```bash
npm run test:e2e -- --testNamePattern="Organizations"
```

### Run tests with coverage

```bash
npm run test:cov
```

## Docker

### Start services

```bash
docker-compose up -d
```

### Stop services

```bash
docker-compose down
```

### Rebuild services

```bash
docker-compose up -d --build
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/organization_db"
PORT=3000
```

## Development

### Format code

```bash
npm run format
```

### Lint code

```bash
npm run lint
```

### Build for production

```bash
npm run build
```

### Run production build

```bash
npm run start:prod
```

## License

MIT
