const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Handle document.uploaded event from Document Service
 * Payload example:
 * {
 *   id: 'document-uuid',
 *   fileName: 'report.pdf',
 *   userId: 'user-uuid',
 *   organizationId: 'org-uuid',
 *   uploadedAt: '2025-01-01T00:00:00Z'
 * }
 */
async function handleDocumentUploaded(payload, message) {
  try {
    logger.info('Processing document.uploaded event', { documentId: payload.id });

    const {
      id: documentId,
      fileName,
      userId,
      organizationId
    } = payload;

    // This is a placeholder for future functionality
    // For now, we just log the event
    logger.info('Document upload notification received', { 
      documentId,
      fileName,
      userId 
    });

    // Future: Could notify organization admins about new documents
    // Future: Could notify AI service to start processing
    // Future: Could send confirmation email to uploader

    // Example of how to send notification:
    /*
    await emailService.sendEmailWithTemplate({
      userId,
      organizationId,
      templateName: 'document_uploaded',
      recipientEmail: userEmail,
      templateVariables: {
        fileName,
        documentId,
        uploadedAt: payload.uploadedAt
      },
      sourceService: 'document-service',
      eventType: 'document.uploaded'
    });
    */

  } catch (error) {
    logger.error('Error handling document.uploaded event', { 
      error,
      payload 
    });
    throw error;
  }
}

module.exports = handleDocumentUploaded;