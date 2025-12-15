import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const documentResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  uploadedBy: z.uuid(),
  fileName: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  downloadUrl: z.url().optional(),
});

export class DocumentResponseDto extends createZodDto(documentResponseSchema) {}

export type DocumentResponse = z.infer<typeof documentResponseSchema>;
