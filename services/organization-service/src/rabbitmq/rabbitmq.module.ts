/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/**
 * RabbitMQ Module for Organization Service
 *
 */
@Global()
@Module({})
export class RabbitMQModule {
  private static readonly logger = new Logger(RabbitMQModule.name);

  /**
   * Register the RabbitMQ module with configuration
   */
  static register(): DynamicModule {
    const rabbitMQUrl =
      process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@localhost:5672';

    this.logger.log(`Configuring RabbitMQ connection to: ${rabbitMQUrl}`);

    return {
      module: RabbitMQModule,
      providers: [RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}
