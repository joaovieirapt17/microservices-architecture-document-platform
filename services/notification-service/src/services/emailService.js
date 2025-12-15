const Handlebars = require("handlebars");
const { sendEmail } = require("../config/mailer");
const notificationRepository = require("../repositories/notificationRepository");
const notificationLogRepository = require("../repositories/notificationLogRepository");
const templateRepository = require("../repositories/notificationTemplateRepository");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES) || 3;
    this.retryDelayMs = parseInt(process.env.EMAIL_RETRY_DELAY_MS) || 5000;
  }

  // Send email using template (by ID or by name)
  async sendEmailWithTemplate(emailData) {
    const {
      userId,
      organizationId,
      templateId,
      templateName,
      recipientEmail,
      templateVariables = {},
      sourceService = "notification-service",
      eventType = "manual",
    } = emailData;

    try {
      let template;

      // 1. Find template (by ID or by name with fallback)
      if (templateId) {
        // Find by ID directly
        template = await templateRepository.findById(templateId);
        if (!template) {
          throw new Error(`Template with ID '${templateId}' not found`);
        }
        if (!template.is_active) {
          throw new Error(`Template with ID '${templateId}' is inactive`);
        }
      } else if (templateName) {
        // Find by name with fallback to default organization
        template = await templateRepository.findWithFallback(
          organizationId,
          templateName
        );
        if (!template) {
          throw new Error(
            `Template '${templateName}' not found for organization ${organizationId}`
          );
        }
      } else {
        throw new Error("Either templateId or templateName must be provided");
      }

      // 2. Compile template with Handlebars
      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyHtmlTemplate = Handlebars.compile(template.body_html);

      const subject = subjectTemplate(templateVariables);
      const bodyHtml = bodyHtmlTemplate(templateVariables);

      let bodyText = null;
      if (template.body_text) {
        const bodyTextTemplate = Handlebars.compile(template.body_text);
        bodyText = bodyTextTemplate(templateVariables);
      }

      // 3. Create notification record
      const notification = await notificationRepository.create({
        userId,
        organizationId: organizationId || template.organization_id,
        templateId: template.id,
        recipientEmail,
        subject,
        bodyHtml,
        bodyText,
        channel: "EMAIL",
        status: "PENDING",
        maxRetries: this.maxRetries,
        metadata: {
          templateId: template.id,
          templateName: template.template_name,
          templateVariables,
          sourceService,
          eventType,
        },
      });

      // 4. Send email
      await this.sendNotification(notification, sourceService, eventType);

      return notification;
    } catch (error) {
      logger.error("Error sending email with template", { error, emailData });
      throw error;
    }
  }

  /**
   * Send direct email (without template)
   */
  async sendDirectEmail(emailData) {
    const {
      userId,
      organizationId,
      recipientEmail,
      subject,
      bodyHtml,
      bodyText,
      sourceService = "notification-service",
      eventType = "manual",
    } = emailData;

    try {
      // 1. Create notification record
      const notification = await notificationRepository.create({
        userId,
        organizationId,
        templateId: null,
        recipientEmail,
        subject,
        bodyHtml,
        bodyText,
        channel: "EMAIL",
        status: "PENDING",
        maxRetries: this.maxRetries,
        metadata: {
          eventType,
          sourceService,
        },
      });

      // 2. Send email
      await this.sendNotification(notification, sourceService, eventType);

      return notification;
    } catch (error) {
      logger.error("Error sending direct email", { error, emailData });
      throw error;
    }
  }

  /**
   * Internal method to handle actual sending with retry logic
   */
  async sendNotification(notification, sourceService, eventType) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt++;

      try {
        logger.info(`Sending email (attempt ${attempt}/${this.maxRetries})`, {
          notificationId: notification.id,
          recipient: notification.recipient_email,
        });

        // Send email via SMTP
        const info = await sendEmail({
          from: process.env.SMTP_FROM || "ScriptumAI <noreply@scriptumai.com>",
          to: notification.recipient_email,
          subject: notification.subject,
          html: notification.body_html,
          text: notification.body_text || undefined,
        });

        // Update notification status to SENT
        await notificationRepository.updateStatus(notification.id, "SENT", {
          sentAt: new Date(),
        });

        // Log success
        await notificationLogRepository.create({
          notificationId: notification.id,
          userId: notification.user_id,
          sourceService,
          eventType,
          recipient: notification.recipient_email,
          channel: "EMAIL",
          status: "SENT",
          smtpResponse: info.response,
          metadata: {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
          },
          subject: notification.subject,
        });

        logger.info("Email sent successfully", {
          notificationId: notification.id,
          messageId: info.messageId,
        });

        return info;
      } catch (error) {
        lastError = error;
        logger.error(`Email send attempt ${attempt} failed`, {
          notificationId: notification.id,
          error: error.message,
          attempt,
          maxRetries: this.maxRetries,
        });

        // Update notification retry count
        await notificationRepository.incrementRetry(notification.id);

        // If not the last attempt, wait before retrying
        if (attempt < this.maxRetries) {
          logger.info(`Waiting ${this.retryDelayMs}ms before retry...`);
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    // All retries failed
    await notificationRepository.updateStatus(notification.id, "FAILED", {
      failedAt: new Date(),
    });

    // Log failure
    await notificationLogRepository.create({
      notificationId: notification.id,
      userId: notification.user_id,
      sourceService,
      eventType,
      recipient: notification.recipient_email,
      channel: "EMAIL",
      status: "FAILED",
      errorMessage: lastError.message,
      errorCode: lastError.code,
      metadata: {
        retries: this.maxRetries,
        lastAttempt: new Date().toISOString(),
      },
      subject: notification.subject,
    });

    logger.error("Email sending failed after all retries", {
      notificationId: notification.id,
      retries: this.maxRetries,
      error: lastError.message,
    });

    throw new Error(
      `Failed to send email after ${this.maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Helper function to sleep/delay
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new EmailService();
