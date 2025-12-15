import { Controller, Get, Inject } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../database/drizzle.provider';
import { sql } from 'drizzle-orm';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * GET /health
   */
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Checks if the service is running and database is connected.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'unhealthy'],
          example: 'healthy',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-01T12:00:00.000Z',
        },
        database: {
          type: 'string',
          enum: ['connected', 'disconnected'],
          example: 'connected',
        },
      },
    },
  })
  async check(): Promise<{
    status: string;
    timestamp: string;
    database: string;
  }> {
    try {
      await this.db.execute(sql`SELECT 1`);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      };
    }
  }
}
