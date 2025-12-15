import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import multipart from '@fastify/multipart';
import { AppModule } from '../src/app.module';

describe('Document Service (E2E)', () => {
  let app: NestFastifyApplication;
  let createdDocumentId: string;

  const MOCK_USER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const MOCK_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Register multipart for file uploads
    await app.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 5,
      },
    });

    app.setGlobalPrefix('api');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String) as unknown as string,
        database: 'connected',
      });
    });
  });

  describe('POST /api/documents', () => {
    it('should upload a file and return 201 Created', async () => {
      const fileContent = Buffer.from('%PDF-1.4 Sample PDF content');

      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .attach('file', fileContent, {
          filename: 'test-document.pdf',
          contentType: 'application/pdf',
        })
        .field('description', 'E2E test document')
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String) as unknown as string,
        organizationId: MOCK_ORG_ID,
        uploadedBy: MOCK_USER_ID,
        fileName: expect.stringMatching(/\.pdf$/) as unknown as string,
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: expect.any(Number) as unknown as number,
        description: 'E2E test document',
        createdAt: expect.any(String) as unknown as string,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdDocumentId = response.body.id;
    });

    it('should return error when no file is uploaded (Content-Type check)', async () => {
      await request(app.getHttpServer())
        .post('/api/documents')
        .send({ description: 'oops' })
        .expect(406);
    });

    it('should upload file without description', async () => {
      const fileContent = Buffer.from('Test content without description');

      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .attach('file', fileContent, {
          filename: 'no-desc.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.description).toBeFalsy();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.originalName).toBe('no-desc.txt');
    });
  });

  describe('GET /api/documents', () => {
    it('should return a list of documents', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.body.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const doc = response.body.find((d: any) => d.id === createdDocumentId);
        expect(doc).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(doc.organizationId).toBe(MOCK_ORG_ID);
      }
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document details with download URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/documents/${createdDocumentId}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(createdDocumentId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.downloadUrl).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.downloadUrl).toContain('9000/documents');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/documents/${fakeId}`)
        .expect(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete an existing document', async () => {
      await request(app.getHttpServer())
        .delete(`/api/documents/${createdDocumentId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/documents/${createdDocumentId}`)
        .expect(404);
    });
  });
});
