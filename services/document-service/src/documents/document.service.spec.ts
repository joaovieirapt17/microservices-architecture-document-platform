import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { DocumentService } from './document.service';
import { MinioService } from 'src/minio/minio.service';
import { DRIZZLE } from 'src/database/drizzle.provider';
import { AuthenticatedUser } from '../common/types/request';
import { UploadDocumentParams } from './interfaces/document.interface';

// ============================================
// MOCK SETUP
// ============================================

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const mockMinioService = {
  uploadFile: jest.fn(),
  getPresignedUrl: jest.fn(),
  deleteFile: jest.fn(),
};

const createDrizzleMock = () => {
  const mockReturning = jest.fn();
  const mockWhere = jest.fn();

  // Build the chains from the end backwards
  const mockValues = jest.fn(() => ({ returning: mockReturning }));
  const mockInsert = jest.fn(() => ({ values: mockValues }));

  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  const mockSelect = jest.fn(() => ({ from: mockFrom }));

  const mockDelete = jest.fn(() => ({ where: jest.fn() }));

  return {
    // The main db object with all query methods
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
    },
    // Expose individual mocks so we can configure them in tests
    mocks: {
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      delete: mockDelete,
    },
  };
};

// ============================================
// TEST SUITE
// ============================================

describe('DocumentService', () => {
  let service: DocumentService;
  let drizzleMock: ReturnType<typeof createDrizzleMock>;

  const mockUser: AuthenticatedUser = {
    userId: 'user-123',
    organizationId: 'org-456',
    role: 'ADMIN',
  };

  const mockDocument = {
    id: 'test-uuid-1234',
    organizationId: 'org-456',
    uploadedBy: 'user-123',
    fileName: 'test-uuid-1234.pdf',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    bucketName: 'documents',
    objectKey: 'org-456/2025/12/test-uuid-1234.pdf',
    description: 'Test document',
    createdAt: new Date('2025-12-02T12:00:00Z'),
    updatedAt: new Date('2025-12-02T12:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    drizzleMock = createDrizzleMock();

    /**
     * Create a testing module using NestJS testing utilities.
     */
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: DRIZZLE,
          useValue: drizzleMock.db,
        },
      ],
    }).compile();

    // Get the service instance from the testing module
    service = module.get<DocumentService>(DocumentService);
  });

  // ============================================
  // uploadDocument Tests
  // ============================================

  describe('uploadDocument', () => {
    /**
     * Test: Successful upload scenario
     */
    it('should upload file to MinIO and save metadata to database', async () => {
      const mockFileStream = Readable.from(Buffer.from('file content'));

      const uploadParams: UploadDocumentParams = {
        file: {
          filename: 'report.pdf',
          mimetype: 'application/pdf',
          file: mockFileStream,
        },
        fileSize: 1024,
        description: 'Test document',
      };

      mockMinioService.uploadFile.mockResolvedValue({
        bucket: 'documents',
        key: 'org-456/2025/12/test-uuid-1234.pdf',
        etag: 'abc123',
      });

      drizzleMock.mocks.returning.mockResolvedValue([mockDocument]);

      // ==================== ACT ====================
      // Execute the method being tested
      const result = await service.uploadDocument(mockUser, uploadParams);

      // ==================== ASSERT ====================
      // Verify the results and side effects

      // 1. Check MinioService was called correctly
      expect(mockMinioService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockMinioService.uploadFile).toHaveBeenCalledWith({
        objectKey: expect.stringContaining('org-456/') as unknown as string, // Contains org ID
        stream: expect.any(Readable) as unknown as Readable,
        size: 1024,
        mimeType: 'application/pdf',
      });

      // 2. Check database insert was called
      expect(drizzleMock.mocks.insert).toHaveBeenCalledTimes(1);
      expect(drizzleMock.mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-1234',
          organizationId: 'org-456',
          uploadedBy: 'user-123',
          originalName: 'report.pdf',
          description: 'Test document',
        }),
      );

      // 3. Check the response structure
      expect(result).toEqual({
        id: 'test-uuid-1234',
        organizationId: 'org-456',
        uploadedBy: 'user-123',
        fileName: 'test-uuid-1234.pdf',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        description: 'Test document',
        createdAt: '2025-12-02T12:00:00.000Z', // Note: converted to ISO string
      });
    });

    /**
     * Test: Error scenario - Database insert fails
     *
     * When DB insert fails, the service should:
     * 1. Delete the already-uploaded file from MinIO (rollback)
     * 2. Re-throw the error
     */
    it('should delete uploaded file from MinIO if database insert fails', async () => {
      // ==================== ARRANGE ====================
      const mockFileStream = Readable.from(Buffer.from('file content'));

      const uploadParams: UploadDocumentParams = {
        file: {
          filename: 'report.pdf',
          mimetype: 'application/pdf',
          file: mockFileStream,
        },
        fileSize: 1024,
      };

      // MinIO upload succeeds
      mockMinioService.uploadFile.mockResolvedValue({
        bucket: 'documents',
        key: 'org-456/2025/12/test-uuid-1234.pdf',
        etag: 'abc123',
      });

      // database insert fails
      const dbError = new Error('Database connection failed');
      drizzleMock.mocks.returning.mockRejectedValue(dbError);

      // Mock deleteFile for rollback
      mockMinioService.deleteFile.mockResolvedValue(undefined);

      // ==================== ACT & ASSERT ====================
      // Use rejects.toThrow() for async functions that should throw

      await expect(
        service.uploadDocument(mockUser, uploadParams),
      ).rejects.toThrow('Database connection failed');

      // Verify rollback happened - file was deleted from MinIO
      expect(mockMinioService.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockMinioService.deleteFile).toHaveBeenCalledWith(
        'org-456/2025/12/test-uuid-1234.pdf',
      );
    });

    /**
     * Test: Error scenario - MinIO upload fails
     *
     * If MinIO upload fails, we should NOT try to insert into database.
     */
    it('should throw error if MinIO upload fails', async () => {
      // ==================== ARRANGE ====================
      const mockFileStream = Readable.from(Buffer.from('file content'));

      const uploadParams: UploadDocumentParams = {
        file: {
          filename: 'report.pdf',
          mimetype: 'application/pdf',
          file: mockFileStream,
        },
        fileSize: 1024,
      };

      // MinIO upload fails
      mockMinioService.uploadFile.mockRejectedValue(
        new Error('Storage unavailable'),
      );

      // ==================== ACT & ASSERT ====================
      await expect(
        service.uploadDocument(mockUser, uploadParams),
      ).rejects.toThrow('Storage unavailable');

      // Verify database was NOT called (since upload failed first)
      expect(drizzleMock.mocks.insert).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // listDocuments Tests
  // ============================================

  describe('listDocuments', () => {
    it('should return all documents for the organization', async () => {
      // ==================== ARRANGE ====================
      const mockDocuments = [mockDocument, { ...mockDocument, id: 'doc-2' }];

      // Configure the select chain to return mock documents
      drizzleMock.mocks.where.mockResolvedValue(mockDocuments);

      // ==================== ACT ====================
      const result = await service.listDocuments(mockUser);

      // ==================== ASSERT ====================
      expect(result).toHaveLength(2);
      expect(drizzleMock.mocks.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no documents exist', async () => {
      // ==================== ARRANGE ====================
      drizzleMock.mocks.where.mockResolvedValue([]);

      // ==================== ACT ====================
      const result = await service.listDocuments(mockUser);

      // ==================== ASSERT ====================
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getDocument Tests
  // ============================================

  describe('getDocument', () => {
    it('should return document with download URL', async () => {
      // ==================== ARRANGE ====================
      drizzleMock.mocks.where.mockResolvedValue([mockDocument]);
      mockMinioService.getPresignedUrl.mockResolvedValue(
        'https://minio.local/documents/file.pdf?signature=xxx',
      );

      // ==================== ACT ====================
      const result = await service.getDocument(mockUser, 'test-uuid-1234');

      // ==================== ASSERT ====================
      expect(result.downloadUrl).toBe(
        'https://minio.local/documents/file.pdf?signature=xxx',
      );
      expect(mockMinioService.getPresignedUrl).toHaveBeenCalledWith({
        objectKey: mockDocument.objectKey,
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // ==================== ARRANGE ====================
      drizzleMock.mocks.where.mockResolvedValue([]); // No documents found

      // ==================== ACT & ASSERT ====================
      await expect(
        service.getDocument(mockUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // deleteDocument Tests
  // ============================================

  describe('deleteDocument', () => {
    it('should delete document from MinIO and database', async () => {
      // ==================== ARRANGE ====================
      drizzleMock.mocks.where.mockResolvedValue([mockDocument]);
      mockMinioService.deleteFile.mockResolvedValue(undefined);

      // ==================== ACT ====================
      await service.deleteDocument(mockUser, 'test-uuid-1234');

      // ==================== ASSERT ====================
      expect(mockMinioService.deleteFile).toHaveBeenCalledWith(
        mockDocument.objectKey,
      );
      expect(drizzleMock.mocks.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when trying to delete non-existent document', async () => {
      // ==================== ARRANGE ====================
      drizzleMock.mocks.where.mockResolvedValue([]);

      // ==================== ACT & ASSERT ====================
      await expect(
        service.deleteDocument(mockUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);

      // MinIO delete should NOT be called
      expect(mockMinioService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
