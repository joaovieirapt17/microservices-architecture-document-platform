import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
      files: 5, // Max 5 files per request
    },
  });

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('ScriptumAI Document Service API')
    .setVersion('1.0.0')
    .addTag('Documents', 'File upload and management operations')
    .addTag('Health', 'Service health checks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ScalarUI /docs
  app.use(
    '/docs',
    apiReference({
      spec: {
        content: document,
      },
      withFastify: true,
      theme: 'purple',
    }),
  );

  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Document Service running on http://localhost:${port}`);
  console.log(`Scalar API Docs: http://localhost:${port}/docs`);
}
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});
