import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  BadRequestException,
  Req,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { DocumentService } from './document.service';
import {
  DocumentResponse,
  DocumentResponseDto,
} from './dto/document-response.dto';
import { type AuthenticatedUser } from 'src/common/types/request';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type FastifyRequest } from 'fastify/types/request';
import { Readable } from 'stream';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteResponseDto } from './dto/delete-response.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  /**
   * POST /documents
   */
  @Post()
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Uploads a file to storage and saves metadata. Supports multipart/form-data (file upload) and application/json (text content).',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description: 'File to upload or JSON content',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['file'],
          properties: {
            file: { type: 'string', format: 'binary' },
            description: { type: 'string' },
          },
        },
        {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            organizationId: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No file uploaded or invalid content',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Storage or database failure',
  })
  async uploadDocument(
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponse> {
    this.logger.log(`Upload request from user: ${user.userId}`);

    const contentType = request.headers['content-type'];

    // Handle JSON text content
    if (contentType?.includes('application/json')) {
      const body = request.body as any;

      if (!body.content || !body.title) {
        throw new BadRequestException(
          'Title and content are required for JSON upload',
        );
      }

      const buffer = Buffer.from(body.content, 'utf-8');
      const stream = Readable.from(buffer);

      const fileObj = {
        filename: `${body.title.replace(/[^a-z0-9]/gi, '_')}.txt`,
        mimetype: 'text/plain',
        file: stream,
      };

      return this.documentService.uploadDocument(user, {
        file: fileObj,
        fileSize: buffer.length,
        description: body.description,
      });
    }

    // Handle Multipart File Upload
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No file uploaded.');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const stream = Readable.from(buffer);

    const fileObj = {
      filename: data.filename,
      mimetype: data.mimetype,
      file: stream,
    };

    return this.documentService.uploadDocument(user, {
      file: fileObj,
      fileSize: buffer.length,
      description: (data.fields.description as any)?.value,
    });
  }

  /**
   * GET /documents
   * List all documents for the current user's organization
   */
  @Get()
  @ApiOperation({
    summary: 'List all documents',
    description: "Returns all documents for the current user's organization.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  async listDocuments(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponse[]> {
    return this.documentService.listDocuments(user);
  }

  /**
   * GET /documents/:id
   * Get a single document with download URL
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a document by ID',
    description: 'Returns details + download URL.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document details',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponse> {
    return this.documentService.getDocument(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Deleted successfully',
    type: DeleteResponseDto,
  })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.documentService.deleteDocument(user, id);
    return { message: `Document ${id} deleted successfully` };
  }
}
