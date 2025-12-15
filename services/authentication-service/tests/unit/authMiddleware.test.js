const authenticate = require('../../src/middleware/authMiddleware');
const TokenService = require('../../src/services/tokenService');
const User = require('../../src/models/User');

// Mocks
jest.mock('../../src/services/tokenService');
jest.mock('../../src/models/User');

describe('AuthMiddleware - Unit Tests', () => {
  let req, res, next;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test',
    surname: 'User',
    organization_id: '123e4567-e89b-12d3-a456-426614174001',
    role: 'user',
    status: 'active',
  };

  const mockToken = 'valid.jwt.token';

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Validação do Token', () => {
    it('deve autenticar com token válido', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      TokenService.verifyAccessToken = jest.fn().mockReturnValue({ id: mockUser.id });
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(TokenService.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(TokenService.verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
        surname: mockUser.surname,
        organization_id: mockUser.organization_id,
        role: mockUser.role,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('deve rejeitar se não houver header de autorização', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided or invalid format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar se formato do token é inválido', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided or invalid format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar se token está na blacklist', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(true);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has been revoked',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar se token é inválido ou expirado', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      TokenService.verifyAccessToken = jest.fn().mockImplementation(() => {
        throw new Error('Invalid or expired access token');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired access token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Validação do Utilizador', () => {
    beforeEach(() => {
      req.headers.authorization = `Bearer ${mockToken}`;
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      TokenService.verifyAccessToken = jest.fn().mockReturnValue({ id: mockUser.id });
    });

    it('deve rejeitar se utilizador não existe', async () => {
      User.findByPk = jest.fn().mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar se utilizador não está ativo', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      User.findByPk = jest.fn().mockResolvedValue(inactiveUser);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User account is not active',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve aceitar utilizador com status "active"', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erros inesperados', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      TokenService.isTokenBlacklisted = jest.fn().mockRejectedValue(new Error('Database error'));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve usar mensagem padrão se erro não tem mensagem', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      TokenService.isTokenBlacklisted = jest.fn().mockRejectedValue({});

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
      });
    });
  });

  describe('Dados do Utilizador no Request', () => {
    it('deve anexar dados corretos do utilizador ao request', async () => {
      req.headers.authorization = `Bearer ${mockToken}`;
      
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      TokenService.verifyAccessToken = jest.fn().mockReturnValue({ id: mockUser.id });
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user).toHaveProperty('id', mockUser.id);
      expect(req.user).toHaveProperty('email', mockUser.email);
      expect(req.user).toHaveProperty('username', mockUser.username);
      expect(req.user).toHaveProperty('name', mockUser.name);
      expect(req.user).toHaveProperty('surname', mockUser.surname);
      expect(req.user).toHaveProperty('organization_id', mockUser.organization_id);
      expect(req.user).toHaveProperty('role', mockUser.role);
      expect(req.user).not.toHaveProperty('password');
      expect(req.user).not.toHaveProperty('status');
    });
  });
});
