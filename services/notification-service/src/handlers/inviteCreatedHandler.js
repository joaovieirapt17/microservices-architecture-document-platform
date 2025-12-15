const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Handle invite.created event from Organization Service
 * Payload example:
 * {
 *   id: 'invite-uuid' OR inviteId: 'invite-uuid',
 *   email: 'user@example.com' OR recipientEmail: 'user@example.com',
 *   recipientName: 'Maria Santos' (optional),
 *   organizationId: 'org-uuid',
 *   organizationName: 'Acme Corp',
 *   invitedBy: 'John Doe' OR inviterName: 'John Doe',
 *   inviteToken: 'token123',
 *   role: 'GESTOR',
 *   createdAt: '2025-01-01T00:00:00Z' (optional)
 * }
 */
async function handleInviteCreated(payload, message) {
  try {
    // FIXED: Support multiple field name variations
    const inviteId = payload.id || payload.inviteId;
    const email = payload.email || payload.recipientEmail;
    const recipientName = payload.recipientName || payload.name || 'Convidado';
    const organizationId = payload.organizationId;
    const organizationName = payload.organizationName;
    const invitedBy = payload.invitedBy || payload.inviterName;
    const inviteToken = payload.inviteToken;
    const role = payload.role;

    // Validate required fields
    if (!email || !organizationName || !invitedBy) {
      throw new Error('Missing required fields: email, organizationName, and invitedBy are required');
    }

    logger.info('Processing invite.created event', { inviteId, email });

    // Build invite link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = inviteToken 
      ? `${baseUrl}/auth/accept-invite?token=${inviteToken}`
      : `${baseUrl}/auth/accept-invite`;

    // FIXED: Use system UUID for invites (since user doesn't exist yet)
    // This is a special UUID that represents system-generated notifications
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

    // Send email using template
    await emailService.sendEmailWithTemplate({
      userId: SYSTEM_USER_ID, // FIXED: Use system user ID instead of null
      organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
      templateName: 'invite',
      recipientEmail: email,
      templateVariables: {
        recipientName,
        organizationName,
        invitedBy,
        inviterName: invitedBy, 
        inviteLink,
        role: role || 'Membro'
      },
      sourceService: 'organization-service',
      eventType: 'invite.created'
    });

    logger.info('Invite email sent successfully', { 
      inviteId,
      email 
    });
  } catch (error) {
    logger.error('Error handling invite.created event', { 
      error: error.message,
      payload 
    });
    throw error;
  }
}

module.exports = handleInviteCreated;