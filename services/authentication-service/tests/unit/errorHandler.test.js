const { errorHandler } = require('../../src/middleware/errorHandler');

describe('ErrorHandler Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
    
    // Mock console.error para não poluir os logs de teste
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Validation Errors', () => {
    it('deve tratar ValidationError com status 400', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = [{ field: 'email', message: 'Invalid email' }];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    });

    it('deve tratar BadRequestError com status 400', () => {
      const error = new Error('Bad request');
      error.name = 'BadRequestError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad request',
        errors: undefined,
      });
    });

    it('deve usar mensagem padrão se não houver mensagem', () => {
      const error = new Error();
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation error',
        })
      );
    });
  });

  describe('Authentication Errors', () => {
    it('deve tratar UnauthorizedError com status 401', () => {
      const error = new Error('Unauthorized access');
      error.name = 'UnauthorizedError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized access',
      });
    });

    it('deve tratar erros relacionados com token', () => {
      const error = new Error('Invalid token provided');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token provided',
      });
    });

    it('deve usar mensagem padrão para erros de autenticação', () => {
      const error = new Error();
      error.name = 'UnauthorizedError';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
        })
      );
    });
  });

  describe('Not Found Errors', () => {
    it('deve tratar NotFoundError com status 404', () => {
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found',
      });
    });

    it('deve usar mensagem padrão para not found', () => {
      const error = new Error();
      error.name = 'NotFoundError';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource not found',
        })
      );
    });
  });

  describe('Generic Server Errors', () => {
    it('deve tratar erros genéricos com status 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong',
      });
    });

    it('deve usar status customizado se fornecido', () => {
      const error = new Error('Conflict');
      error.status = 409;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('deve usar mensagem padrão se não houver mensagem', () => {
      const error = new Error();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });
  });

  describe('Development vs Production', () => {
    it('deve incluir stack trace em desenvolvimento', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error stack trace...';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace...',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('não deve incluir stack trace em produção', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      error.stack = 'Error stack trace...';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging', () => {
    it('deve fazer log de todos os erros', () => {
      const error = new Error('Test error for logging');

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });

    it('deve fazer log mesmo para erros sem mensagem', () => {
      const error = new Error();

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Response Structure', () => {
    it('deve sempre incluir campo success: false', () => {
      const error = new Error('Any error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('deve sempre incluir mensagem', () => {
      const error = new Error('Test message');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    it('deve incluir errors array quando disponível', () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';
      error.errors = [{ field: 'test', msg: 'error' }];

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: error.errors,
        })
      );
    });
  });
});
