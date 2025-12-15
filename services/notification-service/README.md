# 📧 Notification Service

Microserviço de notificações (emails) com suporte a templates dinâmicos e eventos RabbitMQ.

**Projeto:** ScriptumAI Microservices Architecture  
**Disciplina:** Arquitetura de Software - MEI  

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [Templates](#templates)
- [RabbitMQ Events](#rabbitmq-events)
- [Testes](#testes)
- [Documentação](#documentação)

---

## 🎯 Visão Geral

O **Notification Service** é responsável por enviar notificações por email na arquitetura de microserviços do ScriptumAI. Suporta:

- ✅ **Envio direto de emails** (subject + body HTML)
- ✅ **Sistema de templates** com variáveis dinâmicas (Handlebars)
- ✅ **Consumo de eventos RabbitMQ** (user.created, invite.created, document.uploaded)
- ✅ **Retry logic** (3 tentativas com delay de 5 segundos)
- ✅ **Logging estruturado** de todos os envios
- ✅ **API REST** documentada com Swagger
- ✅ **Validação de inputs** com express-validator

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Service                     │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │  API REST    │   │  RabbitMQ    │   │   Database   │     │
│  │  (Express)   │   │  Consumer    │   │ (PostgreSQL) │     │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘     │
│         │                   │                   │           │
│         └───────────┬───────┴───────────────────┘           │
│                     │                                       │
│            ┌────────▼─────────┐                             │
│            │  Email Service   │                             │
│            │  (with retry)    │                             │
│            └────────┬─────────┘                             │
│                     │                                       │
│            ┌────────▼─────────┐                             │
│            │  SMTP (Mailpit)  │                             │
│            └──────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### **Pattern:** Database per Service
- **Porta:** 3005
- **Database:** `notification_db` (PostgreSQL na porta 5435)
- **Message Broker:** RabbitMQ (portas 5672 + 15672)
- **SMTP:** Mailpit para desenvolvimento (portas 1025 + 8025)

---

## ⚙️ Funcionalidades

### 1. **Envio de Emails**
- Email direto com HTML/texto
- Templates reutilizáveis com variáveis Handlebars
- Suporte para organizações (templates por org)
- Retry automático em caso de falha

### 2. **Templates**
- **welcome**: Email de boas-vindas para novos utilizadores
- **invite**: Email de convite para organizações
- Templates personalizáveis por organização
- Variáveis dinâmicas: `{{userName}}`, `{{appName}}`, etc.

### 3. **Eventos RabbitMQ**
- `user.created` → Envia email de boas-vindas
- `invite.created` → Envia email de convite
- `document.uploaded` → Placeholder para futuras notificações

### 4. **Logging e Auditoria**
- Registo de todos os envios (success/fail)
- SMTP responses guardadas
- Metadata de eventos
- Histórico consultável via API

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 18 | Runtime |
| Express | 4.18 | Framework web |
| PostgreSQL | 15 | Base de dados |
| RabbitMQ | 3 | Message broker |
| Nodemailer | 6.9 | Envio de emails |
| Handlebars | 4.7 | Template engine |
| Swagger | 3.0 | Documentação API |
| express-validator | 7.0 | Validação de inputs |
| Docker | Latest | Containerização |

---

## 🚀 Setup

### **Pré-requisitos**
- Docker & Docker Compose
- Node.js 18+ (opcional, para desenvolvimento local)
- Git

### **1. Clonar Repositório**
```bash
git clone https://github.com/ScriptumAI-MEI/scriptumai-microservices-architecture.git
cd scriptumai-microservices-architecture
git checkout feature/notification-service-seara
```

### **2. Configurar Variáveis de Ambiente**
```bash
cd services/notification-service
cp .env.example .env
```

Variáveis importantes:
```env
# Database
DATABASE_HOST=notification-db
DATABASE_PORT=5432
DATABASE_NAME=notification_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:rabbitmq@rabbitmq:5672

# SMTP (Mailpit para dev)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=ScriptumAI <noreply@scriptumai.com>

# Service
PORT=3005
NODE_ENV=development
```

### **3. Iniciar Serviços**
```bash
# Voltar para raiz do projeto
cd ../..

# Iniciar todos os containers
docker-compose up -d

# Ver logs
docker logs notification-service -f
```

### **4. Aplicar Schema da Base de Dados**
```bash
docker exec -i notification-db psql -U postgres -d notification_db < services/notification-service/database/schema.sql
```

### **5. Verificar Status**
```bash
# Containers
docker-compose ps

# Health check
curl http://localhost:3005/health

# Swagger UI
open http://localhost:3005/api-docs
```

---

## 📡 API Endpoints

### **Base URL:** `http://localhost:3005`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger UI |
| `POST` | `/notifications/send` | Enviar notificação |
| `GET` | `/notifications/logs` | Consultar logs |

### **POST /notifications/send**

**Exemplo 1: Email Direto**
```bash
curl -X POST http://localhost:3005/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "recipientEmail": "user@example.com",
    "subject": "Bem-vindo",
    "bodyHtml": "<h1>Olá!</h1><p>Bem-vindo</p>"
  }'
```

**Exemplo 2: Template Welcome**
```bash
curl -X POST http://localhost:3005/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "recipientEmail": "user@example.com",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "templateName": "welcome",
    "templateVariables": {
      "userName": "Pedro Seara",
      "appName": "ScriptumAI"
    }
  }'
```

**Exemplo 3: Template Invite**
```bash
curl -X POST http://localhost:3005/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "recipientEmail": "convidado@example.com",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "templateName": "invite",
    "templateVariables": {
      "recipientName": "Maria Santos",
      "organizationName": "ScriptumAI MEI",
      "inviterName": "Pedro Seara",
      "inviteLink": "http://localhost:3000/accept-invite?token=abc123",
      "role": "GESTOR"
    }
  }'
```

### **GET /notifications/logs**

**Exemplo: Listar últimos 10 logs**
```bash
curl "http://localhost:3005/notifications/logs?limit=10&offset=0"
```

**Exemplo: Filtrar por status**
```bash
curl "http://localhost:3005/notifications/logs?status=SENT&limit=20"
```

---

## 📝 Templates

### **Template: welcome**
**Objetivo:** Email de boas-vindas para novos utilizadores

**Variáveis:**
- `{{userName}}` - Nome do utilizador
- `{{userEmail}}` - Email do utilizador
- `{{appName}}` - Nome da aplicação
- `{{role}}` - Role do utilizador (opcional)

**Subject:** "Bem-vindo ao {{appName}}"

**Evento RabbitMQ:** `user.created`

---

### **Template: invite**
**Objetivo:** Convite para juntar-se a uma organização

**Variáveis:**
- `{{recipientName}}` - Nome do convidado
- `{{organizationName}}` - Nome da organização
- `{{inviterName}}` - Nome de quem convidou
- `{{inviteLink}}` - Link para aceitar convite
- `{{role}}` - Role na organização

**Subject:** "Convite - {{organizationName}}"

**Evento RabbitMQ:** `invite.created`

---

## 🐰 RabbitMQ Events

### **Evento: user.created**
**Queue:** `user.created`  
**Producer:** IDP Service  
**Action:** Envia email de boas-vindas

**Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "CLIENTE"
}
```

---

### **Evento: invite.created**
**Queue:** `invite.created`  
**Producer:** Organization Service  
**Action:** Envia email de convite

**Payload:**
```json
{
  "inviteId": "uuid",
  "recipientEmail": "user@example.com",
  "recipientName": "Maria Santos",
  "organizationName": "Acme Corp",
  "inviterName": "John Doe",
  "inviteToken": "token123",
  "role": "GESTOR"
}
```

---

### **Evento: document.uploaded**
**Queue:** `document.uploaded`  
**Producer:** Document Service  
**Action:** Placeholder (apenas log)

**Payload:**
```json
{
  "documentId": "uuid",
  "fileName": "report.pdf",
  "userId": "uuid",
  "organizationId": "uuid"
}
```

---

## 🧪 Testes

### **Ver Emails (Mailpit)**
```bash
# Abrir UI
open http://localhost:8025

# OU via curl
curl http://localhost:8025/api/v1/messages
```

### **Publicar Evento RabbitMQ (via Management UI)**
1. Abrir http://localhost:15672
2. Login: `rabbitmq` / `rabbitmq`
3. Ir para **Queues and Streams**
4. Clicar na queue desejada
5. Expandir **"Publish message"**
6. Colar payload JSON
7. Clicar **"Publish message"**

### **Verificar Base de Dados**
```bash
# Listar notificações
docker exec -it notification-db psql -U postgres -d notification_db -c \
  "SELECT recipient_email, subject, status, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;"

# Estatísticas
docker exec -it notification-db psql -U postgres -d notification_db -c \
  "SELECT status, COUNT(*) as total FROM notifications GROUP BY status;"
```

---

## 📚 Documentação

### **Swagger UI**
- **URL:** http://localhost:3005/api-docs
- **OpenAPI 3.0**
- **4 exemplos** de uso (email direto, templates)
- **Try it out** para testar diretamente

### **Swagger JSON**
- **URL:** http://localhost:3005/api-docs.json
- Útil para importar no Postman/Insomnia

---

## 📊 Estrutura do Projeto

```
services/notification-service/
├── src/
│   ├── config/
│   │   ├── database.js       # Pool PostgreSQL
│   │   ├── rabbitmq.js       # Cliente RabbitMQ
│   │   ├── mailer.js         # Transporter Nodemailer
│   │   └── swagger.js        # Configuração Swagger
│   ├── controllers/
│   │   ├── notificationController.js
│   │   └── logController.js
│   ├── routes/
│   │   └── notificationRoutes.js
│   ├── services/
│   │   └── emailService.js   # Lógica de envio + retry
│   ├── repositories/
│   │   ├── notificationRepository.js
│   │   ├── notificationLogRepository.js
│   │   └── notificationTemplateRepository.js
│   ├── handlers/
│   │   ├── userCreatedHandler.js
│   │   ├── inviteCreatedHandler.js
│   │   └── documentUploadedHandler.js
│   ├── consumers/
│   │   └── eventConsumer.js  # Subscreve RabbitMQ
│   ├── middleware/
│   │   └── validation.js     # express-validator
│   ├── utils/
│   │   └── logger.js         # Logger estruturado
│   └── server.js             # Entry point
├── database/
│   └── schema.sql            # Schema PostgreSQL
├── .env.example
├── package.json
├── Dockerfile
└── README.md
```

---

## 🔐 Segurança

- ✅ **Validação de inputs** com express-validator
- ✅ **Sanitização** de HTML (proteção XSS)
- ✅ **Helmet** para headers HTTP seguros
- ✅ **CORS** configurado
- ✅ **UUIDs** para IDs (não sequenciais)
- ✅ **Prepared statements** (proteção SQL injection)

---

## 🐛 Troubleshooting

### **Container não inicia**
```bash
docker logs notification-service --tail 50
```

### **RabbitMQ não conecta**
```bash
# Verificar se RabbitMQ está up
docker-compose ps rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq
```

### **Emails não chegam**
```bash
# Verificar Mailpit
docker logs mailpit

# Ver se SMTP está configurado
curl http://localhost:3005/health
```

---

## 📈 Melhorias Futuras

- [ ] Suporte para SMS/Push notifications
- [ ] Email scheduling (enviar no futuro)
- [ ] Email attachments
- [ ] Bulk sending (enviar para listas)
- [ ] Webhooks de status de entrega
- [ ] Métricas Prometheus
- [ ] Circuit breaker para SMTP
- [ ] Testes automatizados (Jest)
- [ ] CI/CD (GitHub Actions)

---

## 📞 Contacto

**Projeto:** ScriptumAI  
**GitHub:** https://github.com/ScriptumAI-MEI/scriptumai-microservices-architecture  
