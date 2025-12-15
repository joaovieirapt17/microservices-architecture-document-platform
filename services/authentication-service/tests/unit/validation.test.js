const {
  validate,
  registerValidation,
  loginValidation,
  changePasswordValidation,
  refreshTokenValidation,
} = require('../../src/middleware/validation');

describe('Validation Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerValidation', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      name: 'Test',
      surname: 'User',
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('deve validar dados de registo corretos', async () => {
      req.body = validRegistrationData;

      await validate(registerValidation)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    describe('Email validation', () => {
      it('deve rejeitar email inválido', async () => {
        req.body = { ...validRegistrationData, email: 'invalid-email' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Validation failed',
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Please provide a valid email address',
              }),
            ]),
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('deve normalizar email', async () => {
        req.body = { ...validRegistrationData, email: 'TEST@EXAMPLE.COM' };

        await validate(registerValidation)(req, res, next);

        expect(req.body.email).toBe('test@example.com');
      });
    });

    describe('Password validation', () => {
      it('deve rejeitar password com menos de 8 caracteres', async () => {
        req.body = { ...validRegistrationData, password: 'Pass1' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Password must be at least 8 characters long',
              }),
            ]),
          })
        );
      });

      it('deve rejeitar password sem letra maiúscula', async () => {
        req.body = { ...validRegistrationData, password: 'password123' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: expect.stringContaining('uppercase letter'),
              }),
            ]),
          })
        );
      });

      it('deve rejeitar password sem letra minúscula', async () => {
        req.body = { ...validRegistrationData, password: 'PASSWORD123' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: expect.stringContaining('lowercase letter'),
              }),
            ]),
          })
        );
      });

      it('deve rejeitar password sem número', async () => {
        req.body = { ...validRegistrationData, password: 'Password' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: expect.stringContaining('number'),
              }),
            ]),
          })
        );
      });
    });

    describe('Username validation', () => {
      it('deve rejeitar username com menos de 3 caracteres', async () => {
        req.body = { ...validRegistrationData, username: 'ab' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Username must be at least 3 characters long',
              }),
            ]),
          })
        );
      });

      it('deve rejeitar username com caracteres especiais', async () => {
        req.body = { ...validRegistrationData, username: 'test@user' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Username can only contain letters, numbers, and underscores',
              }),
            ]),
          })
        );
      });

      it('deve aceitar username com underscore', async () => {
        req.body = { ...validRegistrationData, username: 'test_user' };

        await validate(registerValidation)(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('deve remover espaços do username', async () => {
        req.body = { ...validRegistrationData, username: '  testuser  ' };

        await validate(registerValidation)(req, res, next);

        expect(req.body.username).toBe('testuser');
      });
    });

    describe('Name validation', () => {
      it('deve rejeitar nome com menos de 2 caracteres', async () => {
        req.body = { ...validRegistrationData, name: 'A' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Name must be at least 2 characters long',
              }),
            ]),
          })
        );
      });

      it('deve remover espaços do nome', async () => {
        req.body = { ...validRegistrationData, name: '  João  ' };

        await validate(registerValidation)(req, res, next);

        expect(req.body.name).toBe('João');
      });
    });

    describe('Surname validation', () => {
      it('deve rejeitar apelido com menos de 2 caracteres', async () => {
        req.body = { ...validRegistrationData, surname: 'A' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    describe('OrganizationId validation', () => {
      it('deve aceitar UUID válido', async () => {
        req.body = validRegistrationData;

        await validate(registerValidation)(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('deve rejeitar UUID inválido', async () => {
        req.body = { ...validRegistrationData, organizationId: 'invalid-uuid' };

        await validate(registerValidation)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Organization ID must be a valid UUID',
              }),
            ]),
          })
        );
      });

      it('deve aceitar organizationId opcional', async () => {
        const dataWithoutOrgId = { ...validRegistrationData };
        delete dataWithoutOrgId.organizationId;
        req.body = dataWithoutOrgId;

        await validate(registerValidation)(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('loginValidation', () => {
    it('deve validar dados de login corretos', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await validate(loginValidation)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('deve rejeitar email inválido', async () => {
      req.body = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await validate(loginValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deve rejeitar password vazia', async () => {
      req.body = {
        email: 'test@example.com',
        password: '',
      };

      await validate(loginValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              msg: 'Password is required',
            }),
          ]),
        })
      );
    });
  });

  describe('changePasswordValidation', () => {
    const validPasswordChange = {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
    };

    it('deve validar mudança de password correta', async () => {
      req.body = validPasswordChange;

      await validate(changePasswordValidation)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('deve rejeitar password atual vazia', async () => {
      req.body = { ...validPasswordChange, currentPassword: '' };

      await validate(changePasswordValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              msg: 'Current password is required',
            }),
          ]),
        })
      );
    });

    it('deve aplicar mesmas regras à nova password', async () => {
      req.body = { ...validPasswordChange, newPassword: 'weak' };

      await validate(changePasswordValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refreshTokenValidation', () => {
    it('deve validar refresh token presente', async () => {
      req.body = { refreshToken: 'valid.refresh.token' };

      await validate(refreshTokenValidation)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('deve rejeitar refresh token vazio', async () => {
      req.body = { refreshToken: '' };

      await validate(refreshTokenValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              msg: 'Refresh token is required',
            }),
          ]),
        })
      );
    });

    it('deve rejeitar se refresh token não for fornecido', async () => {
      req.body = {};

      await validate(refreshTokenValidation)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
