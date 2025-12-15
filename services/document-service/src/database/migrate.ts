import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  const sslEnabled = process.env.DB_SSL === 'true';
  const sslParam = sslEnabled ? '?sslmode=require' : '';
  const connectionString = `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'document_db'}${sslParam}`;

  const migrationClient = postgres(connectionString, {
    max: 1,
    ssl: sslEnabled ? 'require' : false,
  });

  console.log('⏳ Running migrations...');

  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './drizzle/migrations',
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
