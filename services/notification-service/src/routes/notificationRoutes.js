
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const logController = require('../controllers/logController');

// Importar AMBOS os middlewares
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  validateSendNotification, 
  validateGetLogs,
  sanitizeInputs 
} = require('../middleware/validationMiddleware');

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Enviar notificação por email
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientEmail]
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               subject:
 *                 type: string
 *                 example: Welcome!
 *               bodyHtml:
 *                 type: string
 *                 example: <h1>Hello!</h1>
 *               templateName:
 *                 type: string
 *                 enum: [welcome, invite]
 *               templateVariables:
 *                 type: object
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       400:
 *         description: Validation failed
 */
router.post(
  '/send',
  authenticateToken,        // 1º: Valida JWT e extrai userId
  sanitizeInputs,           // 2º: Sanitiza HTML (XSS protection)
  validateSendNotification, // 3º: Valida campos
  notificationController.sendNotification
);

/**
 * @swagger
 * /notifications/logs:
 *   get:
 *     summary: Consultar logs de notificações
 *     tags: [Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SENT, FAILED]
 *       - in: query
 *         name: recipient
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/logs',
  authenticateToken,  //  Valida JWT
  validateGetLogs,    //  Valida query params
  logController.getLogs
);

module.exports = router;