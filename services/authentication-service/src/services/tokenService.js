const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");
const { Op } = require("sequelize");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-shared-by-everyone";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_SECRET ||
  "super-secret-key-shared-by-everyone";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "1d";

class TokenService {
  static generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  static async blacklistToken(token, userId) {
    try {
      const decoded = jwt.decode(token);
      const expiresAt = decoded.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

      await TokenBlacklist.findOrCreate({
        where: { token },
        defaults: {
          token,
          user_id: userId,
          expires_at: expiresAt,
        },
      });
    } catch (error) {
      console.error("Error blacklisting token:", error);
    }
  }

  static async isTokenBlacklisted(token) {
    const blacklisted = await TokenBlacklist.findOne({
      where: {
        token,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });
    return !!blacklisted;
  }

  static generateTokenPair(user) {
    const payload = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      role: user.role,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}

module.exports = TokenService;
