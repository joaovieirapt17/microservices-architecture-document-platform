-- Notification Service Database Schema
-- Database per Service pattern - PostgreSQL

-- Criar database se não existir
SELECT 'CREATE DATABASE notification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec

-- Criar user se não existir
DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'notification_user') THEN
    CREATE USER notification_user WITH PASSWORD 'notification_pass_secret';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_user;

-- Conectar à database
\c notification_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO notification_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- Tabela: notification_templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'email',
    subject VARCHAR(255),
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, template_name)
);

-- Tabela: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
    template_id UUID REFERENCES notification_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    channel notification_channel DEFAULT 'EMAIL',
    status notification_status DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    metadata JSONB,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: notification_logs
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    source_service VARCHAR(100),
    event_type VARCHAR(100),
    recipient VARCHAR(255) NOT NULL,
    channel notification_channel DEFAULT 'EMAIL',
    status notification_status NOT NULL,
    error_message TEXT,
    error_code VARCHAR(50),
    smtp_response TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_next_retry ON notifications(next_retry_at) WHERE status = 'PENDING';

CREATE INDEX idx_templates_org_id ON notification_templates(organization_id);
CREATE INDEX idx_templates_active ON notification_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX idx_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX idx_logs_status ON notification_logs(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Templates padrão
INSERT INTO notification_templates (organization_id, template_name, subject, body_html, variables) VALUES
('00000000-0000-0000-0000-000000000000', 'invite', 'Convite - {{organizationName}}', 
 '<h1>Olá!</h1><p>Foi convidado para <strong>{{organizationName}}</strong>.</p><a href="{{inviteLink}}">Aceitar Convite</a>',
 '{"organizationName": "string", "inviteLink": "string"}'),
('00000000-0000-0000-0000-000000000000', 'welcome', 'Bem-vindo ao ScriptumAI!',
 '<h1>Bem-vindo, {{userName}}!</h1><p>A sua conta foi criada com sucesso.</p>',
 '{"userName": "string"}')
ON CONFLICT (organization_id, template_name) DO NOTHING;

-- Ownership 
ALTER TABLE notification_templates OWNER TO notification_user;
ALTER TABLE notifications OWNER TO notification_user;
ALTER TABLE notification_logs OWNER TO notification_user;
