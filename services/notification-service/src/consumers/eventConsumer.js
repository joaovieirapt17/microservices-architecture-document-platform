const rabbitMQClient = require('../config/rabbitmq');
const handleInviteCreated = require('../handlers/inviteCreatedHandler');
const handleUserCreated = require('../handlers/userCreatedHandler');
const handleDocumentUploaded = require('../handlers/documentUploadedHandler');

class EventConsumer {
  async start() {
    try {
      console.log('Starting event consumer...');

      await rabbitMQClient.connect();

      await this.subscribeToEvents();

      console.log('Event consumer started successfully');
    } catch (error) {
      console.error('Failed to start event consumer:', error);
      process.exit(1);
    }
  }

  async subscribeToEvents() {
    const queuePrefix = 'notification-service';

    // 1. Subscribe to invite.created
    await rabbitMQClient.consume(
      `${queuePrefix}.invite.created`,
      'invite.created',
      handleInviteCreated
    );

    // 2. Subscribe to user.created
    await rabbitMQClient.consume(
      `${queuePrefix}.user.created`,
      'user.created',
      handleUserCreated
    );

    // 3. Subscribe to document.uploaded
    await rabbitMQClient.consume(
      `${queuePrefix}.document.uploaded`,
      'document.uploaded',
      handleDocumentUploaded
    );

    console.log('Subscribed to all events');
  }
}

module.exports = new EventConsumer();
