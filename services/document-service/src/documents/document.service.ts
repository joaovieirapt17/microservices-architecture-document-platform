import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from 'src/database/drizzle.provider';
import { MinioService } from 'src/minio/minio.service';
import { DocumentResponse } from './dto/document-response.dto';
import { AuthenticatedUser } from 'src/common/types/request';
import { v4 as uuidv4 } from 'uuid';
import { documents, NewDocument, Document } from 'src/database/schema';
import { UploadDocumentParams } from './interfaces/document.interface';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly minioService: MinioService,
  ) {}

  async uploadDocument(
    user: AuthenticatedUser,
    params: UploadDocumentParams,
  ): Promise<DocumentResponse> {
    const { file, fileSize, description } = params;

    const fileId = uuidv4();
    const fileExtension = file.filename.split('.').pop() || '';

    const now = new Date();
    const objectKey = `${user.organizationId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileId}.${fileExtension}`;

    this.logger.log(`Uploading file: ${file.filename} -> ${objectKey}`);

    // Upload to MinIO
    const uploadResult = await this.minioService.uploadFile({
      objectKey: objectKey,
      stream: file.file,
      size: fileSize,
      mimeType: file.mimetype,
    });

    try {
      // Save metadata to PostgreSQL
      const newDocument: NewDocument = {
        id: fileId,
        organizationId: user.organizationId,
        uploadedBy: user.userId,
        fileName: `${fileId}.${fileExtension}`,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: fileSize,
        bucketName: uploadResult.bucket,
        objectKey: uploadResult.key,
        description: description || null,
      };

      const [insertedDocument] = await this.db
        .insert(documents)
        .values(newDocument)
        .returning();

      this.logger.log(`Document saved: ${insertedDocument.id}`);

      return this.toResponse(insertedDocument);
    } catch (dbError) {
      this.logger.error(
        'Error saving to DB. Deleting uploaded file from MinIO.',
        dbError,
      );

      await this.minioService
        .deleteFile(uploadResult.key)
        .catch((error) =>
          this.logger.error('Critial Error: File cannot be deleted', error),
        );

      throw dbError;
    }
  }

  /**
   * List all documents for an organization
   */
  async listDocuments(user: AuthenticatedUser): Promise<DocumentResponse[]> {
    const docs = await this.db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, user.organizationId));

    // Convert to response DTOs
    return Promise.all(docs.map((doc) => this.toResponse(doc)));
  }

  /**
   * Get a single document by ID
   */
  async getDocument(
    user: AuthenticatedUser,
    documentId: string,
  ): Promise<DocumentResponse> {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, user.organizationId), // Multi-tenancy check
        ),
      );

    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return this.toResponse(doc, true);
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    user: AuthenticatedUser,
    documentId: string,
  ): Promise<void> {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, user.organizationId),
        ),
      );

    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Delete from MinIO
    await this.minioService.deleteFile(doc.objectKey);

    // Delete from database
    await this.db.delete(documents).where(eq(documents.id, documentId));

    this.logger.log(`Document deleted: ${documentId}`);
  }

  /**
   * Convert database entity to response DTO
   */
  private async toResponse(
    doc: Document,
    includeDownloadUrl = false,
  ): Promise<DocumentResponse> {
    const response: DocumentResponse = {
      id: doc.id,
      organizationId: doc.organizationId,
      uploadedBy: doc.uploadedBy,
      fileName: doc.fileName,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      description: doc.description,
      createdAt: doc.createdAt.toISOString(),
    };

    if (includeDownloadUrl) {
      response.downloadUrl = await this.minioService.getPresignedUrl({
        objectKey: doc.objectKey,
      });
    }

    return response;
  }
}
