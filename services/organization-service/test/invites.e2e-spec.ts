import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Invites (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testOrganizationId: string;
  let createdInviteId: string;
  let inviteToken: string;
  const adminUserId = '550e8400-e29b-41d4-a716-446655440001';
  const memberUserId = '550e8400-e29b-41d4-a716-446655440002';
  const testUserId = '550e8400-e29b-41d4-a716-446655440003';

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
        name: 'Test Invite Organization',
        email: 'invites@test.com',
        subdomain: 'invite-test',
        sector: 'Testing',
        city: 'Test City',
        address: 'Test Address',
        contact: 900000000,
        zipCode: '0000-000',
        status: 'active',
      },
    });
    testOrganizationId = org.id;

    // Create an admin member who can create invites
    await prisma.membership.create({
      data: {
        organizationId: testOrganizationId,
        userId: adminUserId,
        role: 'admin',
      },
    });

    // Create a regular member who cannot create invites
    await prisma.membership.create({
      data: {
        organizationId: testOrganizationId,
        userId: memberUserId,
        role: 'member',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invite.deleteMany({
      where: { organizationId: testOrganizationId },
    });
    await prisma.membership.deleteMany({
      where: { organizationId: testOrganizationId },
    });
    await prisma.organization.delete({
      where: { id: testOrganizationId },
    });
    await app.close();
  });

  describe('POST /invites', () => {
    it('should create a new invite when user is admin', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'invitee@test.com',
          role: 'member',
          expiresInDays: 7,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('token');
          expect(response.body.email).toBe('invitee@test.com');
          expect(response.body.role).toBe('member');
          expect(response.body.organizationId).toBe(testOrganizationId);
          createdInviteId = response.body.id;
          inviteToken = response.body.token;
        });
    });

    it('should fail when user is not admin or owner', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: memberUserId,
          organizationId: testOrganizationId,
          email: 'forbidden@test.com',
          role: 'member',
        })
        .expect(403);
    });

    it('should fail with duplicate active invite', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'invitee@test.com',
          role: 'member',
        })
        .expect(409);
    });

    it('should fail with non-existent organization', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: '550e8400-e29b-41d4-a716-446655440099',
          email: 'test@test.com',
          role: 'member',
        })
        .expect(404);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'invalid-email',
          role: 'member',
        })
        .expect(400);
    });

    it('should fail with invalid role', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'test2@test.com',
          role: 'invalid-role',
        })
        .expect(400);
    });

    it('should fail with invalid expiresInDays', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'test3@test.com',
          role: 'member',
          expiresInDays: 50,
        })
        .expect(400);
    });
  });

  describe('GET /invites', () => {
    it('should return all invites', () => {
      return request(app.getHttpServer())
        .get('/api/invites')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });

    it('should filter invites by organizationId', () => {
      return request(app.getHttpServer())
        .get(`/api/invites?organizationId=${testOrganizationId}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((invite: any) => {
            expect(invite.organizationId).toBe(testOrganizationId);
          });
        });
    });
  });

  describe('GET /invites/:id', () => {
    it('should return a specific invite', () => {
      return request(app.getHttpServer())
        .get(`/api/invites/${createdInviteId}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(createdInviteId);
          expect(response.body.email).toBe('invitee@test.com');
          expect(response.body).toHaveProperty('organization');
        });
    });

    it('should return 404 for non-existent invite', () => {
      return request(app.getHttpServer())
        .get('/api/invites/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });

  describe('PATCH /invites/:id/accept', () => {
    it('should accept an invite and create membership', () => {
      return request(app.getHttpServer())
        .patch(`/api/invites/${createdInviteId}/accept`)
        .send({
          token: inviteToken,
          userId: testUserId,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.userId).toBe(testUserId);
          expect(response.body.organizationId).toBe(testOrganizationId);
          expect(response.body.role).toBe('member');
        });
    });

    it('should fail with invalid token', async () => {
      const invite = await prisma.invite.create({
        data: {
          organizationId: testOrganizationId,
          email: 'another@test.com',
          role: 'member',
          token: 'valid-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/invites/${invite.id}/accept`)
        .send({
          token: 'wrong-token',
          userId: '550e8400-e29b-41d4-a716-446655440002',
        })
        .expect(400);

      await prisma.invite.delete({ where: { id: invite.id } });
    });

    it('should fail with expired invite', async () => {
      const expiredInvite = await prisma.invite.create({
        data: {
          organizationId: testOrganizationId,
          email: 'expired@test.com',
          role: 'member',
          token: 'expired-token-123',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/invites/${expiredInvite.id}/accept`)
        .send({
          token: 'expired-token-123',
          userId: '550e8400-e29b-41d4-a716-446655440003',
        })
        .expect(400);

      await prisma.invite.delete({ where: { id: expiredInvite.id } });
    });

    it('should fail if user is already a member', () => {
      return request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrganizationId,
          email: 'duplicate@test.com',
          role: 'member',
        })
        .then((response) => {
          const newInviteId = response.body.id;
          const newToken = response.body.token;

          return request(app.getHttpServer())
            .patch(`/api/invites/${newInviteId}/accept`)
            .send({
              token: newToken,
              userId: testUserId,
            })
            .expect(409);
        });
    });
  });

  describe('DELETE /invites/:id', () => {
    it('should delete an invite', async () => {
      const invite = await prisma.invite.create({
        data: {
          organizationId: testOrganizationId,
          email: 'delete@test.com',
          role: 'member',
          token: 'delete-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/invites/${invite.id}`)
        .expect(204);
    });

    it('should return 404 for non-existent invite', () => {
      return request(app.getHttpServer())
        .delete('/api/invites/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });
});
