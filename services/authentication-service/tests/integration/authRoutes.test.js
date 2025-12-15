const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/authRoutes');
const User = require('../../src/models/User');
const TokenBlacklist = require('../../src/models/TokenBlacklist');
const AuthLog = require('../../src/models/AuthLog');
const bcrypt = require('bcryptjs');
const { errorHandler } = require('../../src/middleware/errorHandler');

// Mocks
jest.mock('../../src/models/User');
jest.mock('../../src/models/TokenBlacklist');
jest.mock('../../src/models/AuthLog');
jest.mock('bcryptjs');

describe('Auth Routes - Integration Tests', () => {
  let app;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test',
    surname: 'User',
    organization_id: '123e4567-e89b-12d3-a456-426614174001',
    password: 'hashedPassword',
    status: 'active',
    role: 'user',
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    AuthLog.create = jest.fn().mockResolvedValue({});
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'Password123',
      username: 'newuser',
      name: 'New',
      surname: 'User',
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('deve registar novo utilizador com sucesso', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('deve retornar erro se email já existe', async () => {
      User.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('deve validar formato do email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('deve validar força da password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('deve validar username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, username: 'ab' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('deve fazer login com sucesso', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('deve retornar erro para credenciais inválidas', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('deve retornar erro para utilizador inexistente', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('deve validar formato do email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...loginData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('deve validar password obrigatória', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    const changePasswordData = {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
    };

    it('deve alterar password com autenticação válida', async () => {
      const mockUpdate = jest.fn().mockResolvedValue();
      const userWithUpdate = { ...mockUser, update: mockUpdate };
      
      // Primeiro fazer login para obter token real
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realToken = loginResponse.body.data.accessToken;
      
      // Agora testar change password com token real
      User.findByPk = jest.fn().mockResolvedValue(userWithUpdate);
      bcrypt.compare = jest.fn()
        .mockResolvedValueOnce(true) // current password correct
        .mockResolvedValueOnce(false); // new password different
      bcrypt.hash = jest.fn().mockResolvedValue('newHashedPassword');
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${realToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('deve rejeitar sem token de autenticação', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send(changePasswordData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('deve validar nova password', async () => {
      // Fazer login primeiro
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${realToken}`)
        .send({ ...changePasswordData, newPassword: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('deve validar campos obrigatórios', async () => {
      // Fazer login primeiro
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${realToken}`)
        .send({ currentPassword: 'OldPassword123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    const logoutData = {
      refreshToken: 'valid.refresh.token',
    };

    it('deve fazer logout com sucesso', async () => {
      // Fazer login primeiro para obter tokens reais
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realAccessToken = loginResponse.body.data.accessToken;
      const realRefreshToken = loginResponse.body.data.refreshToken;

      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);
      TokenBlacklist.findOrCreate = jest.fn().mockResolvedValue([{}, true]);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${realAccessToken}`)
        .send({ refreshToken: realRefreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('deve rejeitar sem token de autenticação', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send(logoutData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('deve aceitar logout mesmo sem refresh token no body', async () => {
      // Fazer login primeiro
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realAccessToken = loginResponse.body.data.accessToken;

      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);
      TokenBlacklist.findOrCreate = jest.fn().mockResolvedValue([{}, true]);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${realAccessToken}`)
        .send({});

      // Logout deve funcionar mesmo sem refreshToken
      // Apenas o accessToken é invalidado
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('deve retornar perfil do utilizador autenticado', async () => {
      // Fazer login primeiro para obter token real
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123',
        });

      const realToken = loginResponse.body.data.accessToken;

      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${realToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('deve rejeitar sem token de autenticação', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('deve rejeitar com token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});