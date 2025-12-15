const AuthService = require("../services/authService");
const { getClientIp, getUserAgent } = require("../utils/requestUtils");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API endpoints for authentication operations
 *
 * @class AuthController
 */
class AuthController {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - username
   *               - name
   *               - surname
   *               - organizationId
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               username:
   *                 type: string
   *               name:
   *                 type: string
   *               surname:
   *                 type: string
   *               organizationId:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Validation error
   */
  static async register(req, res, next) {
    try {
      const { email, password, username, name, surname, organizationId, role } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const result = await AuthService.register(
        { email, password, username, name, surname, organizationId, role },
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const result = await AuthService.login(email, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Validation error
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const result = await AuthService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh authentication token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Unauthorized
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const result = await AuthService.refreshToken(refreshToken, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Logged out successfully
   *       401:
   *         description: Unauthorized
   */
  static async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.substring(7);
      const { refreshToken } = req.body || {};
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const result = await AuthService.logout(
        accessToken,
        refreshToken || null,
        req.user.id,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message || "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  static async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
