const AuthService = require('../../src/services/authService');
const User = require('../../src/models/User');
const AuthLog = require('../../src/models/AuthLog');
const TokenService = require('../../src/services/tokenService');
const bcrypt = require('bcryptjs');

// Mocks
jest.mock('../../src/models/User');
jest.mock('../../src/models/AuthLog');
jest.mock('../../src/services/tokenService');
jest.mock('bcryptjs');

describe('AuthService - Unit Tests', () => {
  const mockUserData = {
    email: 'test@example.com',
    password: 'Password123',
    username: 'testuser',
    name: 'Test',
    surname: 'User',
    organizationId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: mockUserData.email,
    username: mockUserData.username,
    name: mockUserData.name,
    surname: mockUserData.surname,
    organization_id: mockUserData.organizationId,
    password: 'hashedPassword',
    status: 'active',
    role: 'user',
  };

  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default behaviors
    AuthLog.create = jest.fn().mockResolvedValue({});
    TokenService.generateTokenPair = jest.fn().mockReturnValue({
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
    });
  });

  describe('register', () => {
    it('deve registar um novo utilizador com sucesso', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      const result = await AuthService.register(
        mockUserData,
        mockIpAddress,
        mockUserAgent
      );

      expect(User.findOne).toHaveBeenCalledTimes(2); // email e username
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserData.email,
          password: 'hashedPassword',
          username: mockUserData.username,
        })
      );
      expect(TokenService.generateTokenPair).toHaveBeenCalledWith(mockUser);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('deve lançar erro se email já existe', async () => {
      User.findOne = jest.fn()
        .mockResolvedValueOnce(mockUser) // email exists
        .mockResolvedValueOnce(null);

      await expect(
        AuthService.register(mockUserData, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('User with this email already exists');
    });

    it('deve lançar erro se username já existe', async () => {
      User.findOne = jest.fn()
        .mockResolvedValueOnce(null) // email doesn't exist
        .mockResolvedValueOnce(mockUser); // username exists

      await expect(
        AuthService.register(mockUserData, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('Username already taken');
    });

    it('deve registar log de autenticação', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      await AuthService.register(mockUserData, mockIpAddress, mockUserAgent);

      expect(AuthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          action: 'login',
          ip_address: mockIpAddress,
          success: true,
        })
      );
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await AuthService.login(
        mockUserData.email,
        mockUserData.password,
        mockIpAddress,
        mockUserAgent
      );

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: mockUserData.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(mockUserData.password, mockUser.password);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.role).toBe('user');
    });

    it('deve lançar erro se utilizador não existe', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        AuthService.login(mockUserData.email, mockUserData.password, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('Invalid email or password');
    });

    it('deve lançar erro se password está incorreta', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        AuthService.login(mockUserData.email, mockUserData.password, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('Invalid email or password');

      expect(AuthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          success: false,
        })
      );
    });

    it('deve lançar erro se utilizador não está ativo', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      User.findOne = jest.fn().mockResolvedValue(inactiveUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await expect(
        AuthService.login(mockUserData.email, mockUserData.password, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('User account is not active');
    });

    it('deve registar login bem-sucedido', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await AuthService.login(
        mockUserData.email,
        mockUserData.password,
        mockIpAddress,
        mockUserAgent
      );

      expect(AuthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          action: 'login',
          success: true,
        })
      );
    });
  });

  describe('changePassword', () => {
    const currentPassword = 'OldPassword123';
    const newPassword = 'NewPassword456';

    it('deve alterar password com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue();
      const userWithUpdate = { ...mockUser, update: mockUpdate };
      
      User.findByPk = jest.fn().mockResolvedValue(userWithUpdate);
      bcrypt.compare = jest.fn()
        .mockResolvedValueOnce(true) // current password correct
        .mockResolvedValueOnce(false); // new password different
      bcrypt.hash = jest.fn().mockResolvedValue('newHashedPassword');

      const result = await AuthService.changePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        mockIpAddress,
        mockUserAgent
      );

      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newHashedPassword',
        })
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('deve lançar erro se utilizador não existe', async () => {
      User.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        AuthService.changePassword(
          mockUser.id,
          currentPassword,
          newPassword,
          mockIpAddress,
          mockUserAgent
        )
      ).rejects.toThrow('User not found');
    });

    it('deve lançar erro se password atual está incorreta', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        AuthService.changePassword(
          mockUser.id,
          currentPassword,
          newPassword,
          mockIpAddress,
          mockUserAgent
        )
      ).rejects.toThrow('Current password is incorrect');
    });

    it('deve lançar erro se nova password é igual à atual', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true); // both comparisons return true

      await expect(
        AuthService.changePassword(
          mockUser.id,
          currentPassword,
          currentPassword,
          mockIpAddress,
          mockUserAgent
        )
      ).rejects.toThrow('New password must be different from current password');
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid.refresh.token';

    it('deve refrescar tokens com sucesso', async () => {
      const mockDecoded = { id: mockUser.id };
      TokenService.verifyRefreshToken = jest.fn().mockReturnValue(mockDecoded);
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.refreshToken(
        mockRefreshToken,
        mockIpAddress,
        mockUserAgent
      );

      expect(TokenService.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(TokenService.isTokenBlacklisted).toHaveBeenCalledWith(mockRefreshToken);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('deve lançar erro se token está na blacklist', async () => {
      const mockDecoded = { id: mockUser.id };
      TokenService.verifyRefreshToken = jest.fn().mockReturnValue(mockDecoded);
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(true);

      await expect(
        AuthService.refreshToken(mockRefreshToken, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('deve lançar erro se utilizador não existe', async () => {
      const mockDecoded = { id: mockUser.id };
      TokenService.verifyRefreshToken = jest.fn().mockReturnValue(mockDecoded);
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      User.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        AuthService.refreshToken(mockRefreshToken, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('User not found');
    });

    it('deve lançar erro se utilizador não está ativo', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      const mockDecoded = { id: mockUser.id };
      TokenService.verifyRefreshToken = jest.fn().mockReturnValue(mockDecoded);
      TokenService.isTokenBlacklisted = jest.fn().mockResolvedValue(false);
      User.findByPk = jest.fn().mockResolvedValue(inactiveUser);

      await expect(
        AuthService.refreshToken(mockRefreshToken, mockIpAddress, mockUserAgent)
      ).rejects.toThrow('User account is not active');
    });
  });

  describe('logout', () => {
    const mockAccessToken = 'access.token';
    const mockRefreshToken = 'refresh.token';

    it('deve fazer logout com sucesso', async () => {
      TokenService.blacklistToken = jest.fn().mockResolvedValue();

      const result = await AuthService.logout(
        mockAccessToken,
        mockRefreshToken,
        mockUser.id,
        mockIpAddress,
        mockUserAgent
      );

      expect(TokenService.blacklistToken).toHaveBeenCalledTimes(2);
      expect(TokenService.blacklistToken).toHaveBeenCalledWith(mockAccessToken, mockUser.id);
      expect(TokenService.blacklistToken).toHaveBeenCalledWith(mockRefreshToken, mockUser.id);
      expect(AuthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          action: 'logout',
          success: true,
        })
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('deve fazer logout mesmo se log falhar', async () => {
      TokenService.blacklistToken = jest.fn().mockResolvedValue();
      AuthLog.create = jest.fn().mockRejectedValue(new Error('Log error'));

      const result = await AuthService.logout(
        mockAccessToken,
        mockRefreshToken,
        mockUser.id,
        mockIpAddress,
        mockUserAgent
      );

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
