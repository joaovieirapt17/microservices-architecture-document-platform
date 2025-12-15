/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqplib';

/**
 * Event payload for invite.created event
 */
export interface InviteCreatedEvent {
  id: string;
  email: string;
  recipientName?: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
  inviteToken: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Generic event payload structure
 */
export interface EventPayload<T = unknown> {
  pattern: string;
  data: T;
  metadata?: {
    timestamp: string;
    source: string;
    correlationId?: string;
  };
}

/**
 * RabbitMQ Service
 
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000;
  private readonly exchangeName = 'events';
  private readonly exchangeType = 'topic';
  private rabbitmqUrl: string;

  constructor() {
    this.rabbitmqUrl =
      process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@localhost:5672';
  }

  /**
   * Connect to RabbitMQ on module initialization
   */
  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  /**
   * Disconnect from RabbitMQ on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Establish connection to RabbitMQ with retry logic
   */
  private async connect(): Promise<void> {
    while (this.connectionAttempts < this.maxRetries && !this.isConnected) {
      try {
        this.connectionAttempts++;
        this.logger.log(
          `Attempting to connect to RabbitMQ (attempt ${this.connectionAttempts}/${this.maxRetries})...`,
        );

        // Create connection and channel
        this.connection = await amqp.connect(this.rabbitmqUrl);
        this.channel = await this.connection.createChannel();

        // Assert the exchange exists (create if it doesn't)
        await this.channel.assertExchange(
          this.exchangeName,
          this.exchangeType,
          {
            durable: true,
          },
        );

        this.isConnected = true;
        this.connectionAttempts = 0;
        this.logger.log('✅ Successfully connected to RabbitMQ');

        // Handle connection close
        this.connection.on('close', () => {
          this.logger.warn(
            'RabbitMQ connection closed. Will reconnect on next emit.',
          );
          this.isConnected = false;
          this.channel = null;
          this.connection = null;
        });

        // Handle connection errors
        this.connection.on('error', (err) => {
          this.logger.error(`RabbitMQ connection error: ${err.message}`);
          this.isConnected = false;
        });
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(
          `Failed to connect to RabbitMQ (attempt ${this.connectionAttempts}/${this.maxRetries}): ${error.message}`,
        );

        if (this.connectionAttempts < this.maxRetries) {
          this.logger.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
          await this.sleep(this.retryDelay);
        } else {
          this.logger.error(
            'Max connection attempts reached. Service will continue without RabbitMQ.',
          );
          // Don't throw - allow service to continue (graceful degradation)
        }
      }
    }
  }

  /**
   * Disconnect from RabbitMQ gracefully
   */
  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      this.logger.log('Disconnected from RabbitMQ');
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  /**
   * Emit an event to RabbitMQ
   *
   * Publishes the event to the 'events' topic exchange with the specified routing key.
   * The event is published with the 'persistent' flag to ensure durability.
   *
   * @param pattern - The routing key for the event (e.g., 'invite.created')
   * @param data - The event payload
   * @returns Promise<boolean> - true if publish succeeded, false otherwise
   */
  async emit<T>(pattern: string, data: T): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      this.logger.warn(
        `RabbitMQ not connected. Attempting to reconnect before emitting ${pattern}...`,
      );
      await this.connect();

      if (!this.isConnected || !this.channel) {
        this.logger.error(
          `Cannot emit ${pattern}: RabbitMQ connection unavailable`,
        );
        return false;
      }
    }

    const eventPayload: EventPayload<T> = {
      pattern,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'organization-service',
        correlationId: this.generateCorrelationId(),
      },
    };

    try {
      this.logger.log(`📤 Emitting event: ${pattern}`);
      this.logger.debug(`Event payload: ${JSON.stringify(eventPayload)}`);

      // Publish to the exchange with the routing key
      const published = this.channel.publish(
        this.exchangeName,
        pattern, // routing key
        Buffer.from(JSON.stringify(eventPayload.data)),
        {
          persistent: true, // Survive broker restart
          contentType: 'application/json',
          timestamp: Date.now(),
        },
      );

      if (!published) {
        this.logger.warn(
          `Channel buffer full, waiting before confirming ${pattern}`,
        );
        // Wait for drain event if buffer is full
        await new Promise((resolve) => this.channel?.once('drain', resolve));
      }

      this.logger.log(`✅ Event ${pattern} emitted successfully`);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to emit event ${pattern}: ${error.message}`);
      return false;
    }
  }

  /**
   * Emit invite.created event
   *
   * Convenience method specifically for invite creation events.
   * Structures the payload according to the Notification Service expectations.
   *
   * @param invite - The invite data from Prisma
   * @param organizationName - Name of the organization
   * @param inviterName - Name of the person who created the invite
   */
  async emitInviteCreated(
    invite: {
      id: string;
      email: string;
      organizationId: string;
      token: string;
      role: string;
      expiresAt: Date;
      createdAt: Date;
    },
    organizationName: string,
    inviterName: string = 'Team Admin',
  ): Promise<boolean> {
    const payload: InviteCreatedEvent = {
      id: invite.id,
      email: invite.email,
      organizationId: invite.organizationId,
      organizationName: organizationName,
      invitedBy: inviterName,
      inviteToken: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };

    return this.emit('invite.created', payload);
  }

  /**
   * Check if RabbitMQ is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Generate a unique correlation ID for tracing events
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Helper method for async sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
