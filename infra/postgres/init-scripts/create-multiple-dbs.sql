
-- AUTH SERVICE
CREATE USER auth_user WITH PASSWORD 'auth_pass_secret';
CREATE DATABASE auth_db;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;

-- Grant schema permissions for auth_user
\c auth_db;
GRANT ALL ON SCHEMA public TO auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO auth_user;

-- DOCUMENT SERVICE
CREATE USER document_user WITH PASSWORD 'document_pass_secret';
CREATE DATABASE document_db;
GRANT ALL PRIVILEGES ON DATABASE document_db TO document_user;

\c document_db;
GRANT ALL ON SCHEMA public TO document_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO document_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO document_user;

-- NOTIFICATION SERVICE
CREATE USER notification_user WITH PASSWORD 'notification_pass_secret';
CREATE DATABASE notification_db;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_user;

-- Grant schema permissions for notification_user
\c notification_db;
GRANT ALL ON SCHEMA public TO notification_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO notification_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO notification_user;

-- ORGANIZATION SERVICE
CREATE USER organization_user WITH PASSWORD 'organization_pass_secret';
CREATE DATABASE organization_db;
GRANT ALL PRIVILEGES ON DATABASE organization_db TO organization_user;

-- Grant schema permissions for organization_user
\c organization_db;
GRANT ALL ON SCHEMA public TO organization_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO organization_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO organization_user;