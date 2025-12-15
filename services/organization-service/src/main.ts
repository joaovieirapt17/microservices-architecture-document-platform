import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties not defined in DTO
      forbidNonWhitelisted: true, // Return error if non-whitelisted properties are sent
      transform: true, // Transform payloads to types defined in DTOs
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Organization Service API')
    .setDescription(
      'API for managing organizations, memberships, and invitations',
    )
    .setVersion('1.0')
    .addTag('organizations', 'Organization management endpoints')
    .addTag('memberships', 'Membership management endpoints')
    .addTag('invites', 'Invitation management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
