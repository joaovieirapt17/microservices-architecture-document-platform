import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Memberships (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testOrganizationId: string;
  let createdMembershipId: string;
  const adminUserId = '550e8400-e29b-41d4-a716-446655440010';
  const testUserId = '550e8400-e29b-41d4-a716-446655440011';
  const testUserId2 = '550e8400-e29b-41d4-a716-446655440012';

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

    // Create a test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Membership Organization',
        email: 'memberships@test.com',
        subdomain: 'membership-test',
        sector: 'Testing',
        city: 'Test City',
        address: 'Test Address',
        contact: 900000001,
        zipCode: '0000-000',
        status: 'active',
      },
    });
    testOrganizationId = org.id;

    // Create an admin member
    await prisma.membership.create({
      data: {
        organizationId: testOrganizationId,
        userId: adminUserId,
        role: 'admin',
      },
    });

    // Create test memberships
    const membership = await prisma.membership.create({
      data: {
        organizationId: testOrganizationId,
        userId: testUserId,
        role: 'member',
      },
    });
    createdMembershipId = membership.id;

    await prisma.membership.create({
      data: {
        organizationId: testOrganizationId,
        userId: testUserId2,
        role: 'viewer',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.membership.deleteMany({
      where: { organizationId: testOrganizationId },
    });
    await prisma.organization.delete({
      where: { id: testOrganizationId },
    });
    await app.close();
  });

  describe('GET /memberships', () => {
    it('should return all memberships', () => {
      return request(app.getHttpServer())
        .get('/api/memberships')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should filter memberships by organizationId', () => {
      return request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${testOrganizationId}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          response.body.forEach((membership: any) => {
            expect(membership.organizationId).toBe(testOrganizationId);
          });
        });
    });

    it('should filter memberships by userId', () => {
      return request(app.getHttpServer())
        .get(`/api/memberships?userId=${testUserId}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((membership: any) => {
            expect(membership.userId).toBe(testUserId);
          });
        });
    });

    it('should filter memberships by organizationId and userId', () => {
      return request(app.getHttpServer())
        .get(
          `/api/memberships?organizationId=${testOrganizationId}&userId=${testUserId}`,
        )
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(1);
          response.body.forEach((membership: any) => {
            expect(membership.organizationId).toBe(testOrganizationId);
            expect(membership.userId).toBe(testUserId);
          });
        });
    });
  });

  describe('GET /memberships/:id', () => {
    it('should return a specific membership', () => {
      return request(app.getHttpServer())
        .get(`/api/memberships/${createdMembershipId}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdMembershipId);
          expect(response.body.userId).toBe(testUserId);
          expect(response.body.organizationId).toBe(testOrganizationId);
          expect(response.body).toHaveProperty('organization');
        });
    });

    it('should return 404 for non-existent membership', () => {
      return request(app.getHttpServer())
        .get('/api/memberships/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });

  describe('PATCH /memberships/:id', () => {
    it('should update a membership role when user is admin', () => {
      return request(app.getHttpServer())
        .patch(`/api/memberships/${createdMembershipId}`)
        .send({
          userId: adminUserId,
          role: 'admin',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdMembershipId);
          expect(response.body.role).toBe('admin');
        });
    });

    it('should fail when user is not admin or owner', () => {
      return request(app.getHttpServer())
        .patch(`/api/memberships/${createdMembershipId}`)
        .send({
          userId: testUserId2,
          role: 'viewer',
        })
        .expect(403);
    });

    it('should fail with invalid role', () => {
      return request(app.getHttpServer())
        .patch(`/api/memberships/${createdMembershipId}`)
        .send({
          userId: adminUserId,
          role: 'invalid-role',
        })
        .expect(400);
    });

    it('should return 404 for non-existent membership', () => {
      return request(app.getHttpServer())
        .patch('/api/memberships/550e8400-e29b-41d4-a716-446655440099')
        .send({
          userId: adminUserId,
          role: 'admin',
        })
        .expect(404);
    });
  });

  describe('DELETE /memberships/:id', () => {
    it('should delete a membership when user is admin', async () => {
      const membership = await prisma.membership.create({
        data: {
          organizationId: testOrganizationId,
          userId: '550e8400-e29b-41d4-a716-446655440013',
          role: 'member',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/memberships/${membership.id}?userId=${adminUserId}`)
        .expect(204);
    });

    it('should fail when user is not admin or owner', async () => {
      const membership = await prisma.membership.create({
        data: {
          organizationId: testOrganizationId,
          userId: '550e8400-e29b-41d4-a716-446655440014',
          role: 'member',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/memberships/${membership.id}?userId=${testUserId2}`)
        .expect(403);

      // Cleanup
      await prisma.membership.delete({ where: { id: membership.id } });
    });

    it('should return 404 for non-existent membership', () => {
      return request(app.getHttpServer())
        .delete(
          `/api/memberships/550e8400-e29b-41d4-a716-446655440099?userId=${adminUserId}`,
        )
        .expect(404);
    });
  });
});
