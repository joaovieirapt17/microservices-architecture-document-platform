// services/notification-service/src/middleware/validationMiddleware.js

const { body, query, validationResult } = require('express-validator');

/**
 * Middleware para tratar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Validação para POST /notifications/send
 */
const validateSendNotification = [  
  // Campos obrigatórios
  body('recipientEmail')
    .notEmpty().withMessage('recipientEmail is required')
    .isEmail().withMessage('recipientEmail must be a valid email'),
  
  // Campos opcionais mas com validação
  body('organizationId')
    .optional()
    .isUUID().withMessage('organizationId must be a valid UUID'),
  
  body('subject')
    .optional()
    .isString().withMessage('subject must be a string')
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('subject must be between 1 and 255 characters'),
  
  body('bodyHtml')
    .optional()
    .isString().withMessage('bodyHtml must be a string')
    .trim()
    .isLength({ min: 1, max: 50000 }).withMessage('bodyHtml must be between 1 and 50000 characters'),
  
  body('bodyText')
    .optional()
    .isString().withMessage('bodyText must be a string')
    .trim()
    .isLength({ max: 50000 }).withMessage('bodyText must not exceed 50000 characters'),
  
  body('templateId')
    .optional()
    .isUUID().withMessage('templateId must be a valid UUID'),
  
  body('templateName')
    .optional()
    .isString().withMessage('templateName must be a string')
    .trim()
    .isIn(['welcome', 'invite']).withMessage('templateName must be either "welcome" or "invite"'),
  
  body('templateVariables')
    .optional()
    .isObject().withMessage('templateVariables must be an object'),
  
  // Validação customizada: garantir que tem subject+bodyHtml OU template
  body().custom((value, { req }) => {
    const hasDirectEmail = req.body.subject && req.body.bodyHtml;
    const hasTemplate = req.body.templateId || req.body.templateName;
    
    if (!hasDirectEmail && !hasTemplate) {
      throw new Error('Must provide either (subject + bodyHtml) or (templateId/templateName)');
    }
    
    return true;
  }),
  
  // Validação: se usa templateName, precisa de organizationId
  body().custom((value, { req }) => {
    if (req.body.templateName && !req.body.organizationId) {
      throw new Error('organizationId is required when using templateName');
    }
    
    return true;
  }),
  
  handleValidationErrors
];

/**
 * Validação para GET /notifications/logs
 */
const validateGetLogs = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('offset must be a non-negative integer'),
  
  query('status')
    .optional()
    .isIn(['SENT', 'FAILED']).withMessage('status must be either SENT or FAILED'),
  
  query('recipient')
    .optional()
    .isEmail().withMessage('recipient must be a valid email'),
  
  query('userId')
    .optional()
    .isUUID().withMessage('userId must be a valid UUID'),
  
  handleValidationErrors
];

/**
 * Sanitização de inputs (proteção contra XSS)
 */
const sanitizeInputs = (req, res, next) => {
  // Lista de campos HTML que precisam ser sanitizados
  const htmlFields = ['bodyHtml', 'bodyText', 'subject'];
  
  htmlFields.forEach(field => {
    if (req.body[field]) {
      // Remove scripts maliciosos mas mantém HTML válido
      req.body[field] = req.body[field]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers inline
    }
  });
  
  next();
};

module.exports = {
  validateSendNotification,
  validateGetLogs,
  sanitizeInputs,
  handleValidationErrors
};