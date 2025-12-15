const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Notification Service API",
      version: "1.0.0",
      description: `
API de envio de notificações (emails) com suporte a templates e eventos RabbitMQ.
      `,
      contact: {
        name: "ScriptumAI Team",
        email: "dev@scriptumai.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3005/api",
        description: "Development - Direct Access (Port 3005)",
      },
      {
        url: "http://localhost/api/notifications",
        description: "Production - Via API Gateway (Port 80)",
      },
    ],
    tags: [
      {
        name: "Notifications",
        description: "Endpoints para envio de notificações por email",
      },
      {
        name: "Logs",
        description: "Endpoints para consulta de logs e auditoria",
      },
      {
        name: "Health",
        description: "Health check e monitorização do serviço",
      },
    ],
    components: {
      schemas: {
        NotificationRequest: {
          type: "object",
          required: ["userId", "recipientEmail"],
          properties: {
            userId: {
              type: "string",
              format: "uuid",
              description: "ID do utilizador que vai receber a notificação",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            organizationId: {
              type: "string",
              format: "uuid",
              description:
                "ID da organização (obrigatório para templates específicos)",
              example: "00000000-0000-0000-0000-000000000000",
            },
            recipientEmail: {
              type: "string",
              format: "email",
              description: "Email do destinatário",
              example: "user@example.com",
            },
            subject: {
              type: "string",
              description:
                "Assunto do email (obrigatório se não usar template)",
              example: "Bem-vindo ao ScriptumAI",
            },
            bodyHtml: {
              type: "string",
              description:
                "Corpo do email em HTML (obrigatório se não usar template)",
              example: "<h1>Olá!</h1><p>Bem-vindo à plataforma!</p>",
            },
            bodyText: {
              type: "string",
              description: "Corpo do email em texto simples (fallback)",
              example: "Olá! Bem-vindo à plataforma!",
            },
            templateName: {
              type: "string",
              enum: ["welcome", "invite"],
              description: "Nome do template (alternativa a subject/bodyHtml)",
              example: "welcome",
            },
            templateVariables: {
              type: "object",
              description: "Variáveis para renderizar o template Handlebars",
              example: {
                userName: "Pedro Seara",
                appName: "ScriptumAI",
                inviteLink: "https://app.scriptumai.com/invite/abc123",
              },
            },
          },
        },
        NotificationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Notification sent successfully",
            },
            data: {
              type: "object",
              properties: {
                notificationId: {
                  type: "string",
                  format: "uuid",
                  example: "87cb0f70-0587-4d9b-a4ee-b05b6a36558d",
                },
                status: {
                  type: "string",
                  enum: ["PENDING", "SENT", "FAILED"],
                  example: "SENT",
                },
                recipientEmail: {
                  type: "string",
                  example: "user@example.com",
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Validation failed",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    example: "recipientEmail",
                  },
                  message: {
                    type: "string",
                    example: "Invalid email format",
                  },
                },
              },
            },
          },
        },
        LogEntry: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            notification_id: {
              type: "string",
              format: "uuid",
            },
            source_service: {
              type: "string",
              example: "notification-service",
            },
            event_type: {
              type: "string",
              example: "api.send",
            },
            recipient: {
              type: "string",
            },
            channel: {
              type: "string",
              enum: ["EMAIL", "SMS", "PUSH"],
            },
            status: {
              type: "string",
              enum: ["PENDING", "SENT", "FAILED"],
            },
            error_message: {
              type: "string",
              nullable: true,
            },
            smtp_response: {
              type: "string",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        LogsResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
              properties: {
                logs: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/LogEntry",
                  },
                },
                pagination: {
                  type: "object",
                  properties: {
                    limit: {
                      type: "integer",
                      example: 50,
                    },
                    offset: {
                      type: "integer",
                      example: 0,
                    },
                    total: {
                      type: "integer",
                      example: 150,
                    },
                    totalPages: {
                      type: "integer",
                      example: 3,
                    },
                  },
                },
                filters: {
                  type: "object",
                },
              },
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "healthy",
            },
            service: {
              type: "string",
              example: "notification-service",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            uptime: {
              type: "number",
              example: 1234.56,
              description: "Uptime em segundos",
            },
            documentation: {
              type: "string",
              example: "http://localhost:3005/api-docs",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/server.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
