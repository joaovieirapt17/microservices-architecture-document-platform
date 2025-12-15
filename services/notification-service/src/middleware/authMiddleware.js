const jwt = require('jsonwebtoken');

/**
 * Middleware para validar JWT e extrair userId
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
      hint: 'Include Authorization: Bearer <token> header'
    });
  }

  try {
    // Validar JWT (mesma secret que auth-service)
    const SECRET_TOKEN = process.env.SECRET_TOKEN || 'change-this-secret-key';
    const decoded = jwt.verify(token, SECRET_TOKEN);
    
    // Adicionar dados do usuário ao request
    req.userId = decoded.userId || decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.organizationId = decoded.organizationId;
    
    console.log(`[AUTH] User authenticated: ${req.userId} (${req.userEmail})`);
    
    next();
  } catch (error) {
    console.error('[AUTH] JWT validation error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
}

/**
 * Middleware opcional - permite requests sem auth
 * Útil para consumidores RabbitMQ ou health checks
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const SECRET_TOKEN = process.env.SECRET_TOKEN || 'change-this-secret-key';
      const decoded = jwt.verify(token, SECRET_TOKEN);
      req.userId = decoded.userId || decoded.id;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
      req.organizationId = decoded.organizationId;
    } catch (error) {
      // Token inválido, mas não bloqueia
      console.warn('[AUTH] Optional auth: Invalid token, proceeding without auth');
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth
};