const amqp = require("amqplib");

class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;

    // Build RabbitMQ URL from environment variables
    if (process.env.RABBITMQ_URL) {
      this.url = process.env.RABBITMQ_URL;
    } else {
      const user = encodeURIComponent(process.env.RABBITMQ_USER || "guest");
      const password = encodeURIComponent(process.env.RABBITMQ_PASSWORD || "guest");
      const host = process.env.RABBITMQ_HOST || "localhost";
      const port = process.env.RABBITMQ_PORT || "5672";
      this.url = `amqp://${user}:${password}@${host}:${port}`;
    }

    this.exchange = process.env.RABBITMQ_EXCHANGE || "events";
    this.reconnectDelay = 5000;
  }

  async connect() {
    try {
      console.log("Connecting to RabbitMQ...");

      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, "topic", { durable: true });

      console.log("RabbitMQ connected");

      this.connection.on("close", () => {
        console.warn("RabbitMQ connection closed. Reconnecting...");
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      this.connection.on("error", (err) => {
        console.error("RabbitMQ error:", err);
      });

      return this.channel;
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error.message);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  async consume(queue, routingKey, handler) {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, this.exchange, routingKey);
      await this.channel.prefetch(10);

      console.log(`Listening to: ${routingKey}`);

      await this.channel.consume(
        queue,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              await handler(content, msg);
              this.channel.ack(msg);
            } catch (error) {
              console.error("Error processing message:", error);
              this.channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );
    } catch (error) {
      console.error("Failed to setup consumer:", error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("RabbitMQ connection closed");
    } catch (error) {
      console.error("Error closing RabbitMQ:", error);
    }
  }
}

const rabbitMQClient = new RabbitMQClient();

process.on("SIGINT", async () => {
  await rabbitMQClient.close();
  process.exit(0);
});

module.exports = rabbitMQClient;
