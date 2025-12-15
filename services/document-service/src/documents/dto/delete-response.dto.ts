import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const deleteResponseSchema = z.object({
  message: z.string(),
});

export class DeleteResponseDto extends createZodDto(deleteResponseSchema) {}
