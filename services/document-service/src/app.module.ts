import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DrizzleModule } from './database/drizzle.module';
import { MinioModule } from './minio/minio.module';
import { DocumentsModule } from './documents/document.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DrizzleModule,
    MinioModule,
    DocumentsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
