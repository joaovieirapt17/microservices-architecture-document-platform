const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AuthLog = require("../models/AuthLog");
const TokenService = require("./tokenService");

class AuthService {
  static async register(userData, ipAddress, userAgent) {
    const { email, password, username, name, surname, organizationId, role } = userData;

    console.log("[AuthService] Registration data:", {
      email,
      username,
      role,
      organizationId,
    });

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      throw new Error("Username already taken");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: passwordHash,
      username,
      name,
      surname,
      organization_id: organizationId,
      role: role || "user", // Default to 'user' if not provided
    });

    console.log("[AuthService] User created with role:", user.role);

    await AuthLog.create({
      user_id: user.id,
      action: "login",
      ip_address: ipAddress,
      success: true,
    }).catch((err) => {
      console.warn("Error creating registration log:", err.message);
    });

    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        surname: user.surname,
        organization_id: user.organization_id,
        role: user.role,
      },
      ...tokens,
    };
  }

  static async login(email, password, ipAddress, userAgent) {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await AuthLog.create({
        user_id: user.id,
        action: "login",
        ip_address: ipAddress,
        success: false,
      }).catch(() => {});
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (user.status !== "active") {
      await AuthLog.create({
        user_id: user.id,
        action: "login",
        ip_address: ipAddress,
        success: false,
      }).catch(() => {});
      throw new Error("User account is not active");
    }

    // Log successful login
    await AuthLog.create({
      user_id: user.id,
      action: "login",
      ip_address: ipAddress,
      success: true,
    }).catch(() => {});

    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        surname: user.surname,
        organization_id: user.organization_id,
        role: user.role,
      },
      ...tokens,
    };
  }

  static async changePassword(
    userId,
    currentPassword,
    newPassword,
    ipAddress,
    userAgent
  ) {
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      await AuthLog.create({
        user_id: user.id,
        action: "login",
        ip_address: ipAddress,
        success: false,
      }).catch(() => {});
      throw new Error("Current password is incorrect");
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({
      password: newPasswordHash,
      updated_at: new Date(),
    });

    // Log password change
    await AuthLog.create({
      user_id: user.id,
      action: "login",
      ip_address: ipAddress,
      success: true,
    }).catch(() => {});

    return { message: "Password changed successfully" };
  }

  static async refreshToken(refreshToken, ipAddress, userAgent) {
    // Verify refresh token
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    // Check if token is blacklisted
    const isBlacklisted = await TokenService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new Error("Refresh token has been revoked");
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is active
    if (user.status !== "active") {
      throw new Error("User account is not active");
    }

    await AuthLog.create({
      user_id: user.id,
      action: "login",
      ip_address: ipAddress,
      success: true,
    }).catch(() => {});

    // Generate new token pair
    const tokens = TokenService.generateTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        surname: user.surname,
        organization_id: user.organization_id,
        role: user.role,
      },
      ...tokens,
    };
  }

  static async logout(accessToken, refreshToken, userId, ipAddress, userAgent) {
    // Blacklist tokens (skip refresh token if not provided)
    const promises = [TokenService.blacklistToken(accessToken, userId)];
    if (refreshToken) {
      promises.push(TokenService.blacklistToken(refreshToken, userId));
    }
    await Promise.all(promises);

    // Log logout
    await AuthLog.create({
      user_id: userId,
      action: "logout",
      ip_address: ipAddress,
      success: true,
    }).catch(() => {});

    return { message: "Logged out successfully" };
  }
}

module.exports = AuthService;
