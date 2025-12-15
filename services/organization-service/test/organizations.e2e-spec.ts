import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Organizations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let createdOrgId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.organization.deleteMany({
      where: {
        OR: [
          { email: 'test@organization.com' },
          { email: 'updated@organization.com' },
        ],
      },
    });
    await app.close();
  });

  describe('POST /organizations', () => {
    it('should create a new organization', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Test Organization',
          email: 'test@organization.com',
          subdomain: 'test-org',
          sector: 'Technology',
          city: 'Lisbon',
          address: 'Rua Test, 123',
          contact: 912345678,
          zipCode: '1000-001',
          status: 'active',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe('Test Organization');
          expect(response.body.email).toBe('test@organization.com');
          expect(response.body.subdomain).toBe('test-org');
          createdOrgId = response.body.id;
        });
    });

    it('should fail with duplicate subdomain', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Another Organization',
          email: 'another@organization.com',
          subdomain: 'test-org',
          sector: 'Technology',
          city: 'Lisbon',
          address: 'Rua Test, 456',
          contact: 912345679,
          zipCode: '1000-002',
          status: 'active',
        })
        .expect(409);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Invalid Organization',
          email: 'invalid-email',
          subdomain: 'invalid-org',
          sector: 'Technology',
          city: 'Lisbon',
          address: 'Rua Test, 789',
          contact: 912345680,
          zipCode: '1000-003',
          status: 'active',
        })
        .expect(400);
    });

    it('should fail with invalid zipCode format', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Invalid Zip Organization',
          email: 'invalid-zip@organization.com',
          subdomain: 'invalid-zip-org',
          sector: 'Technology',
          city: 'Lisbon',
          address: 'Rua Test, 789',
          contact: 912345680,
          zipCode: '10000-1',
          status: 'active',
        })
        .expect(400);
    });

    it('should fail with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Incomplete Organization',
          email: 'incomplete@organization.com',
        })
        .expect(400);
    });
  });

  describe('GET /organizations', () => {
    it('should return all organizations', () => {
      return request(app.getHttpServer())
        .get('/api/organizations')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /organizations/:id', () => {
    it('should return a specific organization', () => {
      return request(app.getHttpServer())
        .get(`/api/organizations/${createdOrgId}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdOrgId);
          expect(response.body.name).toBe('Test Organization');
          expect(response.body).toHaveProperty('memberships');
          expect(response.body).toHaveProperty('invites');
        });
    });

    it('should return 404 for non-existent organization', () => {
      return request(app.getHttpServer())
        .get('/api/organizations/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('should update an organization', () => {
      return request(app.getHttpServer())
        .patch(`/api/organizations/${createdOrgId}`)
        .send({
          name: 'Updated Test Organization',
          email: 'updated@organization.com',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.name).toBe('Updated Test Organization');
          expect(response.body.email).toBe('updated@organization.com');
        });
    });

    it('should return 404 for non-existent organization', () => {
      return request(app.getHttpServer())
        .patch('/api/organizations/550e8400-e29b-41d4-a716-446655440099')
        .send({
          name: 'Non-existent Organization',
        })
        .expect(404);
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('should delete an organization', () => {
      return request(app.getHttpServer())
        .delete(`/api/organizations/${createdOrgId}`)
        .expect(204);
    });

    it('should return 404 for non-existent organization', () => {
      return request(app.getHttpServer())
        .delete('/api/organizations/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });
});
