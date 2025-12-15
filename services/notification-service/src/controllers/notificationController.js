// services/notification-service/src/controllers/notificationController.js

const emailService = require('../services/emailService');
const logger = require('../utils/logger');

class NotificationController {
  /*
   * POST /notifications/send
   * Send a notification (email)
   * 
   * AUTHENTICATION: Requires JWT token in Authorization header
   * - userId is extracted from JWT token (req.userId)
   * - userEmail is extracted from JWT token (req.userEmail)
   * 
   * Body: {
   *   recipientEmail: 'user@example.com',  // REQUIRED
   *   
   *   // Option 1: Direct email
   *   subject: 'Subject',
   *   bodyHtml: '<p>HTML content</p>',
   *   bodyText: 'Plain text content' (optional),
   *   
   *   // Option 2: Using template by ID
   *   templateId: 'uuid',
   *   templateVariables: {} (optional),
   *   
   *   // Option 3: Using template by name
   *   templateName: 'invite',
   *   organizationId: 'uuid' (required with templateName),
   *   templateVariables: {} (optional)
   * }
   */
  async sendNotification(req, res) {
    try {
      // userId vem do JWT (middleware authenticateToken)
      const userId = req.userId;
      const userEmail = req.userEmail;
      const userRole = req.userRole;
      
      // Campos do body
      const {
        organizationId,
        recipientEmail,
        subject,
        bodyHtml,
        bodyText,
        templateId,      
        templateName,
        templateVariables
      } = req.body;

      // Validação já foi feita pelo validationMiddleware
      // Mas vamos garantir que recipientEmail existe
      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: 'recipientEmail is required'
        });
      }

      logger.info(`[NOTIFICATION] User ${userId} (${userEmail}) sending email to ${recipientEmail}`);

      let notification;

      // Check if using template (by ID or name) or direct email
      if (templateId || templateName) {
        // Send with template
        
        // If using templateName, organizationId is required
        if (templateName && !organizationId) {
          return res.status(400).json({
            success: false,
            message: 'organizationId is required when using templateName'
          });
        }

        notification = await emailService.sendEmailWithTemplate({
          userId,              // Do JWT
          organizationId,
          templateId,     
          templateName,
          recipientEmail,
          templateVariables: templateVariables || {},
          sourceService: 'notification-service',
          eventType: 'api.send'
        });
      } else {
        // Send direct email
        if (!subject || !bodyHtml) {
          return res.status(400).json({
            success: false,
            message: 'subject and bodyHtml are required for direct emails'
          });
        }

        notification = await emailService.sendDirectEmail({
          userId,              // Do JWT
          organizationId,
          recipientEmail,
          subject,
          bodyHtml,
          bodyText,
          sourceService: 'notification-service',
          eventType: 'api.send'
        });
      }

      logger.info('Notification sent via API', { 
        notificationId: notification.id,
        userId,
        userEmail,
        recipientEmail
      });

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully',
        data: {
          notificationId: notification.id,
          status: notification.status,
          recipientEmail: notification.recipient_email,
          sentBy: {
            userId,
            email: userEmail
          }
        }
      });
    } catch (error) {
      logger.error('Error in sendNotification controller', { 
        error: error.message,
        userId: req.userId,
        recipientEmail: req.body.recipientEmail
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();