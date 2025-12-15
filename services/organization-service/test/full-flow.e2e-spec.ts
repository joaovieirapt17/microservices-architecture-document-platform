import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Full Flow Integration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let organizationId: string;
  let inviteId: string;
  let inviteToken: string;
  let membershipId: string;
  const userId1 = '550e8400-e29b-41d4-a716-446655440020';
  const userId2 = '550e8400-e29b-41d4-a716-446655440021';

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
    // Clean up all test data
    if (organizationId) {
      await prisma.invite.deleteMany({
        where: { organizationId },
      });
      await prisma.membership.deleteMany({
        where: { organizationId },
      });
      // Only delete if organization still exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });
      if (org) {
        await prisma.organization.delete({
          where: { id: organizationId },
        });
      }
    }
    await app.close();
  });

  describe('Complete Organization Workflow', () => {
    it('Step 1: Create a new organization', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Full Flow Test Organization',
          email: 'fullflow@test.com',
          subdomain: 'full-flow-test',
          sector: 'Technology',
          city: 'Porto',
          address: 'Rua Full Flow, 100',
          contact: 920000000,
          zipCode: '4000-100',
          status: 'active',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Full Flow Test Organization');
      expect(response.body.subdomain).toBe('full-flow-test');
      organizationId = response.body.id;
    });

    it('Step 2: Verify organization was created', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${organizationId}`)
        .expect(200);

      expect(response.body.id).toBe(organizationId);
      expect(response.body.name).toBe('Full Flow Test Organization');
      expect(response.body.memberships).toEqual([]);
      expect(response.body.invites).toEqual([]);
    });

    it('Step 3: Create an invitation for the first user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          organizationId: organizationId,
          email: 'user1@test.com',
          role: 'admin',
          expiresInDays: 7,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body.email).toBe('user1@test.com');
      expect(response.body.role).toBe('admin');
      inviteId = response.body.id;
      inviteToken = response.body.token;
    });

    it('Step 4: Verify invite appears in organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${organizationId}`)
        .expect(200);

      expect(response.body.invites).toHaveLength(1);
      expect(response.body.invites[0].id).toBe(inviteId);
      expect(response.body.invites[0].email).toBe('user1@test.com');
    });

    it('Step 5: List invites for the organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/invites?organizationId=${organizationId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('user1@test.com');
    });

    it('Step 6: Accept the invitation (create membership)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/invites/${inviteId}/accept`)
        .send({
          token: inviteToken,
          userId: userId1,
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(userId1);
      expect(response.body.organizationId).toBe(organizationId);
      expect(response.body.role).toBe('admin');
      membershipId = response.body.id;
    });

    it('Step 7: Verify membership was created', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships/${membershipId}`)
        .expect(200);

      expect(response.body.id).toBe(membershipId);
      expect(response.body.userId).toBe(userId1);
      expect(response.body.role).toBe('admin');
    });

    it('Step 8: Verify invite was deleted after acceptance', async () => {
      await request(app.getHttpServer())
        .get(`/api/invites/${inviteId}`)
        .expect(404);
    });

    it('Step 9: Verify membership appears in organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${organizationId}`)
        .expect(200);

      expect(response.body.memberships).toHaveLength(1);
      expect(response.body.memberships[0].id).toBe(membershipId);
      expect(response.body.memberships[0].userId).toBe(userId1);
      expect(response.body.invites).toHaveLength(0);
    });

    it('Step 10: Create a second invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: userId1,
          organizationId: organizationId,
          email: 'user2@test.com',
          role: 'member',
          expiresInDays: 14,
        })
        .expect(201);

      expect(response.body.email).toBe('user2@test.com');
      expect(response.body.role).toBe('member');
    });

    it('Step 11: List all memberships for the organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${organizationId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(userId1);
    });

    it('Step 12: Update membership role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/memberships/${membershipId}`)
        .send({
          userId: userId1,
          role: 'owner',
        })
        .expect(200);

      expect(response.body.role).toBe('owner');
    });

    it('Step 13: Verify membership role was updated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships/${membershipId}`)
        .expect(200);

      expect(response.body.role).toBe('owner');
    });

    it('Step 14: Update organization details', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${organizationId}`)
        .send({
          name: 'Updated Full Flow Organization',
          city: 'Lisbon',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Full Flow Organization');
      expect(response.body.city).toBe('Lisbon');
    });

    it('Step 15: Create and accept another invite', async () => {
      const inviteResponse = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: userId1,
          organizationId: organizationId,
          email: 'user3@test.com',
          role: 'viewer',
        })
        .expect(201);

      const newInviteId = inviteResponse.body.id;
      const newInviteToken = inviteResponse.body.token;

      const membershipResponse = await request(app.getHttpServer())
        .patch(`/api/invites/${newInviteId}/accept`)
        .send({
          token: newInviteToken,
          userId: userId2,
        })
        .expect(200);

      expect(membershipResponse.body.userId).toBe(userId2);
      expect(membershipResponse.body.role).toBe('viewer');
    });

    it('Step 16: Verify total memberships count', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${organizationId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('Step 17: Get memberships for specific user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships?userId=${userId1}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      const userMembership = response.body.find(
        (m: any) => m.organizationId === organizationId,
      );
      expect(userMembership).toBeDefined();
      expect(userMembership.role).toBe('owner');
    });

    it('Step 18: Delete a membership', async () => {
      const memberships = await request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${organizationId}`)
        .expect(200);

      const membershipToDelete = memberships.body.find(
        (m: any) => m.userId === userId2,
      );

      await request(app.getHttpServer())
        .delete(`/api/memberships/${membershipToDelete.id}?userId=${userId1}`)
        .expect(204);
    });

    it('Step 19: Verify membership was deleted', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${organizationId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(userId1);
    });

    it('Step 20: Delete the organization', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${organizationId}`)
        .expect(204);
    });

    it('Step 21: Verify organization was deleted', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${organizationId}`)
        .expect(404);
    });

    it('Step 22: Verify memberships were cascade deleted', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/memberships?organizationId=${organizationId}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('Error Handling in Full Flow', () => {
    let testOrgId: string;

    beforeAll(async () => {
      // Create a test organization for error scenarios
      const org = await prisma.organization.create({
        data: {
          name: 'Error Test Organization',
          email: 'errortest@test.com',
          subdomain: 'error-test',
          sector: 'Testing',
          city: 'Test City',
          address: 'Test Address',
          contact: 930000000,
          zipCode: '0000-000',
          status: 'active',
        },
      });
      testOrgId = org.id;
    });

    afterAll(async () => {
      await prisma.invite.deleteMany({
        where: { organizationId: testOrgId },
      });
      await prisma.membership.deleteMany({
        where: { organizationId: testOrgId },
      });
      await prisma.organization.delete({
        where: { id: testOrgId },
      });
    });

    it('Should prevent duplicate invite for same email', async () => {
      await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          organizationId: testOrgId,
          email: 'duplicate@test.com',
          role: 'member',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          organizationId: testOrgId,
          email: 'duplicate@test.com',
          role: 'admin',
        })
        .expect(409);
    });

    it('Should prevent accepting invite with wrong token', async () => {
      const inviteResponse = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          organizationId: testOrgId,
          email: 'wrongtoken@test.com',
          role: 'member',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/invites/${inviteResponse.body.id}/accept`)
        .send({
          token: 'wrong-token',
          userId: '550e8400-e29b-41d4-a716-446655440030',
        })
        .expect(400);
    });

    it('Should prevent duplicate membership', async () => {
      const adminUserId = '550e8400-e29b-41d4-a716-446655440031';
      const memberUserId = '550e8400-e29b-41d4-a716-446655440032';

      // Create first invite for admin and accept it
      const invite1 = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          organizationId: testOrgId,
          email: 'admin@test.com',
          role: 'admin',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/invites/${invite1.body.id}/accept`)
        .send({
          token: invite1.body.token,
          userId: adminUserId,
        })
        .expect(200);

      // Create second invite for a member and accept it
      const invite2 = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrgId,
          email: 'member@test.com',
          role: 'member',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/invites/${invite2.body.id}/accept`)
        .send({
          token: invite2.body.token,
          userId: memberUserId,
        })
        .expect(200);

      // Try to create and accept another invite for the same user (should fail)
      const invite3 = await request(app.getHttpServer())
        .post('/api/invites')
        .send({
          userId: adminUserId,
          organizationId: testOrgId,
          email: 'member2@test.com',
          role: 'viewer',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/invites/${invite3.body.id}/accept`)
        .send({
          token: invite3.body.token,
          userId: memberUserId,
        })
        .expect(409);
    });
  });
});
