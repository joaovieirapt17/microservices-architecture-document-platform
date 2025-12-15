const TokenService = require('../../src/services/tokenService');
const TokenBlacklist = require('../../src/models/TokenBlacklist');
const jwt = require('jsonwebtoken');

// Mock do modelo TokenBlacklist
jest.mock('../../src/models/TokenBlacklist');

describe('TokenService - Unit Tests', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('deve gerar um access token válido', () => {
      const token = TokenService.generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.exp).toBeDefined();
    });

    it('deve incluir tempo de expiração no token', () => {
      const token = TokenService.generateAccessToken(mockUser);
      const decoded = jwt.decode(token);
      
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
    });
  });

  describe('generateRefreshToken', () => {
    it('deve gerar um refresh token válido', () => {
      const token = TokenService.generateRefreshToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('deve ter tempo de expiração maior que access token', () => {
      const accessToken = TokenService.generateAccessToken(mockUser);
      const refreshToken = TokenService.generateRefreshToken(mockUser);
      
      const decodedAccess = jwt.decode(accessToken);
      const decodedRefresh = jwt.decode(refreshToken);
      
      expect(decodedRefresh.exp).toBeGreaterThan(decodedAccess.exp);
    });
  });

  describe('verifyAccessToken', () => {
    it('deve verificar um token válido', () => {
      const token = TokenService.generateAccessToken(mockUser);
      const decoded = TokenService.verifyAccessToken(token);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('deve lançar erro para token inválido', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        TokenService.verifyAccessToken(invalidToken);
      }).toThrow('Invalid or expired access token');
    });

    it('deve lançar erro para token expirado', () => {
      const expiredToken = jwt.sign(
        mockUser, 
        process.env.SECRET_TOKEN, 
        { expiresIn: '-1s' }
      );
      
      expect(() => {
        TokenService.verifyAccessToken(expiredToken);
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('deve verificar um refresh token válido', () => {
      const token = TokenService.generateRefreshToken(mockUser);
      const decoded = TokenService.verifyRefreshToken(token);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('deve lançar erro para refresh token inválido', () => {
      const invalidToken = 'invalid.refresh.token';
      
      expect(() => {
        TokenService.verifyRefreshToken(invalidToken);
      }).toThrow('Invalid or expired refresh token');
    });
  });

  describe('generateTokenPair', () => {
    it('deve gerar par de tokens (access e refresh)', () => {
      const tokens = TokenService.generateTokenPair(mockUser);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('deve gerar tokens diferentes', () => {
      const tokens = TokenService.generateTokenPair(mockUser);
      
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('blacklistToken', () => {
    it('deve adicionar token à blacklist', async () => {
      const token = TokenService.generateAccessToken(mockUser);
      const mockFindOrCreate = jest.fn().mockResolvedValue([{}, true]);
      TokenBlacklist.findOrCreate = mockFindOrCreate;

      await TokenService.blacklistToken(token, mockUser.id);

      expect(mockFindOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token },
          defaults: expect.objectContaining({
            token,
            user_id: mockUser.id,
            expires_at: expect.any(Date)
          })
        })
      );
    });

    it('deve lidar com erros silenciosamente', async () => {
      const token = TokenService.generateAccessToken(mockUser);
      TokenBlacklist.findOrCreate = jest.fn().mockRejectedValue(new Error('DB Error'));

      // Não deve lançar erro
      await expect(
        TokenService.blacklistToken(token, mockUser.id)
      ).resolves.not.toThrow();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('deve retornar true se token está na blacklist', async () => {
      const token = 'blacklisted.token';
      TokenBlacklist.findOne = jest.fn().mockResolvedValue({ token });

      const result = await TokenService.isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(TokenBlacklist.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ token })
        })
      );
    });

    it('deve retornar false se token não está na blacklist', async () => {
      const token = 'valid.token';
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);

      const result = await TokenService.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });

    it('deve verificar se token não expirou', async () => {
      const token = 'token.to.check';
      await TokenService.isTokenBlacklisted(token);

      expect(TokenBlacklist.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expires_at: expect.objectContaining({
              [Symbol.for('gt')]: expect.any(Date)
            })
          })
        })
      );
    });
  });
});
