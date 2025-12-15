const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Handle user.created event from IDP Service
 * Payload example:
 * {
 *   id: 'user-uuid' OR userId: 'user-uuid',  
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   role: 'CLIENTE' (optional),
 *   createdAt: '2025-01-01T00:00:00Z' (optional)
 * }
 */
async function handleUserCreated(payload, message) {
  try {
    // FIXED: Support both 'id' and 'userId' in the payload
    const userId = payload.id || payload.userId;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;

    // Validate required fields
    if (!userId || !email || !name) {
      throw new Error('Missing required fields: userId/id, email, and name are required');
    }

    logger.info('Processing user.created event', { userId, email });

    // Send welcome email using template
    await emailService.sendEmailWithTemplate({
      userId,
      organizationId: '00000000-0000-0000-0000-000000000000', 
      templateName: 'welcome',
      recipientEmail: email,
      templateVariables: {
        userName: name,
        userEmail: email,
        role: role || 'Utilizador',
        appName: 'ScriptumAI'
      },
      sourceService: 'idp-service',
      eventType: 'user.created'
    });

    logger.info('Welcome email sent successfully', { 
      userId,
      email 
    });
  } catch (error) {
    logger.error('Error handling user.created event', { 
      error: error.message,
      payload 
    });
    throw error;
  }
}

module.exports = handleUserCreated;