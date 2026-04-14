import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../user/model/User.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError
} from "../../utils/customError.js";
import logger from "../../config/logger.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    saveRefreshToken
} from "../../utils/token.util.js";
import RefreshToken from "./RefreshToken.model.js";
import PasswordResetToken from "./PasswordResetToken.model.js";
import { sendPasswordChangedEmail, sendPasswordResetEmail } from "../../utils/email.util.js";

const PASSWORD_RESET_EXPIRY_MINUTES = 5;
const RESET_OTP_LENGTH = 6;
const MAX_RESET_OTP_ATTEMPTS = 5;
const RESET_OTP_LOCK_MINUTES = 15;
const INVALID_RESET_CREDENTIALS_MESSAGE = "Invalid or expired reset credentials";

const generateNumericOtp = (length = RESET_OTP_LENGTH) => {
    let otp = "";
    for (let i = 0; i < length; i += 1) {
        otp += crypto.randomInt(0, 10).toString();
    }
    return otp;
};

// Public service functions 

// LOGIN
export const login = async (email, password, platform, metadata = {}) => {
    logger.info("Login attempt", { email, platform });
    
    if (!email || !password) throw new BadRequestError("Email and password are required");

    const user = await User.findOne({ email })
        .select("+password")
        .populate("schoolId", "name code");

    if (!user) {
        logger.warn("Login failed: User not found", { email, platform });
        throw new UnauthorizedError("Invalid credentials");
    }

    // Check account status
    if (!user.isActive) {
        logger.warn("Login failed: Account deactivated", { email, platform, role: user.role });
        throw new ForbiddenError("Account is deactivated");
    }

    if (user.isArchived) {
        logger.warn("Login failed: Account archived", { email, platform, role: user.role });
        throw new ForbiddenError("Account has been archived. Contact your administrator.");
    }

    // Platform-specific restrictions
    if (platform === 'web') {
        if (user.role === USER_ROLES.STUDENT) {
            throw new ForbiddenError("Access denied for students");
        }
    } else if (platform === 'mobile') {
        if (![USER_ROLES.STUDENT, USER_ROLES.TEACHER].includes(user.role)) {
            throw new ForbiddenError("Only students and teachers can access the mobile app");
        }
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logger.warn("Login failed: Invalid password", { email, platform, role: user.role });
        throw new UnauthorizedError("Invalid credentials");
    }

    // Update login time
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store in new RefreshToken collection
    await saveRefreshToken(user._id, refreshToken, { ...metadata, platform });

    const userResponse = {
        name: user.name,
        userid: user._id,
        schoolId: user.schoolId?._id,
        schoolName: user.schoolId?.name,
        email: user.email,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
        avatarUrl: user.avatarUrl,
        avatarPublicId: user.avatarPublicId,
        updatedAt: user.updatedAt,
    };

    // Attach role-specific profile data (e.g. assignedClasses for teachers)
    if (user.role === USER_ROLES.TEACHER) {
        const teacherProfile = await TeacherProfile.findOne({ userId: user._id })
            .select("assignedClasses expectedSalary")
            .lean();
        userResponse.profile = teacherProfile || null;
    } else if (user.role === USER_ROLES.STUDENT) {
        const studentProfile = await StudentProfile.findOne({ userId: user._id })
            .select("standard section rollNumber")
            .lean();
        userResponse.profile = studentProfile || null;
    }

    return { user: userResponse, accessToken, refreshToken };
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (oldRefreshToken, metadata = {}) => {
    if (!oldRefreshToken) throw new UnauthorizedError("Refresh token is required");

    const oldHash = hashToken(oldRefreshToken);

    const tokenDoc = await RefreshToken.findOne({
        tokenHash: oldHash,
    }).populate({
        path: "userId",
        populate: { path: "schoolId", select: "name code" }
    });

    if (!tokenDoc) {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (tokenDoc.expiresAt <= new Date()) {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (tokenDoc.isRevoked) {
        logger.warn("Refresh token reuse attempted", {
            userId: tokenDoc.userId?._id || tokenDoc.userId,
            tokenHashPrefix: oldHash.substring(0, 8),
            platform: tokenDoc.metadata?.platform,
        });

        await RefreshToken.updateMany(
            { userId: tokenDoc.userId?._id || tokenDoc.userId, isRevoked: false },
            { $set: { isRevoked: true, expiresAt: new Date() } }
        );

        throw new UnauthorizedError("Refresh token has been revoked");
    }

    const user = tokenDoc.userId;
    if (!user || !user.isActive || user.isArchived) {
        throw new UnauthorizedError("User is no longer active");
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);

    await RefreshToken.updateOne(
        { _id: tokenDoc._id },
        { 
            $set: { 
                replacedByTokenHash: newHash,
                isRevoked: true
            } 
        }
    );

    await saveRefreshToken(user._id, newRefreshToken, { ...tokenDoc.metadata, ...metadata });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// LOGOUT
export const logout = async (refreshToken) => {
    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await RefreshToken.deleteOne({ tokenHash });
    }
    return { message: "Logged out successfully" };
};

// UPDATE PASSWORD (for users with system-generated passwords)
export const updatePassword = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
        throw new BadRequestError("Current password and new password are required");
    }

    if (newPassword.length < 8) {
        throw new BadRequestError("New password must be at least 8 characters long");
    }

    const user = await User.findById(userId)
        .select("+password")
        .populate("schoolId", "name");
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new UnauthorizedError("Current password is incorrect");
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new BadRequestError("New password cannot be the same as the current password");
    }

    // Update password and reset mustChangePassword flag
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    try {
        await sendPasswordChangedEmail({
            to: user.email,
            name: user.name,
            schoolName: user.schoolId?.name || "School Management System",
            reason: "password change from profile/security",
        });
    } catch (notifyError) {
        logger.warn("Failed to send password change notification after profile update", {
            userId,
            error: notifyError.message,
        });
    }

    logger.info("Password updated successfully", { userId });
    return { message: "Password updated successfully" };
};

// FORGOT PASSWORD - Request password reset email
export const forgotPassword = async (email, metadata = {}, method = null) => {
    logger.info("Forgot password request", { email, method });

    if (!email) {
        throw new BadRequestError("Email is required");
    }

    // Find user by email (but don't reveal if not found for security)
    const user = await User.findOne({ email })
        .populate("schoolId", "name");

    // If no user found, return silently to prevent email enumeration
    if (!user) {
        logger.warn("Forgot password: User not found", { email });
        return { message: "If an account exists, password reset instructions have been sent." };
    }

    // Check if account is active
    if (!user.isActive || user.isArchived) {
        logger.warn("Forgot password: Account inactive or archived", { email, userId: user._id });
        return { message: "If an account exists, password reset instructions have been sent." };
    }

    // Invalidate any existing unused tokens for this user
    await PasswordResetToken.updateMany(
        { userId: user._id, isUsed: false },
        { $set: { isUsed: true } }
    );

    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    let resetToken = null;
    let tokenHash = null;
    let resetOtp = null;
    let otpHash = null;

    // Generate token or OTP based on selected method (or both if no method specified for backward compatibility)
    if (!method || method === 'link') {
        resetToken = crypto.randomBytes(32).toString("hex");
        tokenHash = hashToken(resetToken);
    }
    if (!method || method === 'otp') {
        resetOtp = generateNumericOtp();
        otpHash = hashToken(resetOtp);
    }

    // Save token/OTP hashes to database
    await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        otpHash,
        expiresAt,
        metadata,
    });

    // Send email with selected method only
    await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken,
        resetOtp,
        method,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
        schoolName: user.schoolId?.name || "School Management System",
    });

    logger.info("Password reset email sent", { email, userId: user._id, method });

    return { message: "If an account exists, password reset instructions have been sent." };
};

// RESET PASSWORD - Set new password using reset token
export const resetPassword = async (token, newPassword) => {
    logger.info("Password reset attempt");

    if (!token || !newPassword) {
        throw new BadRequestError("Reset token and new password are required");
    }

    if (newPassword.length < 8) {
        throw new BadRequestError("New password must be at least 8 characters long");
    }

    // Hash token for DB lookup (DB only stores hashes)
    const tokenHash = hashToken(token);

    // Lookup reset request (non-atomic read for validation context)
    const resetTokenDoc = await PasswordResetToken.findOne({
        tokenHash,
        isUsed: false,
    });

    if (!resetTokenDoc || resetTokenDoc.expiresAt <= new Date()) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    // Fetch user with password explicitly selected
    const user = await User.findById(resetTokenDoc.userId)
        .select("+password")
        .populate("schoolId", "name");

    // Check user status
    if (!user || !user.isActive || user.isArchived) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new BadRequestError("New password cannot be the same as your current password");
    }

    // Atomically claim token to prevent race/reuse
    const claimedResetToken = await PasswordResetToken.findOneAndUpdate(
        {
            _id: resetTokenDoc._id,
            isUsed: false,
            expiresAt: { $gt: new Date() },
        },
        {
            $set: {
                isUsed: true,
                consumedAt: new Date(),
            },
        },
        { new: true }
    );

    if (!claimedResetToken) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    // Update user password
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    // Delete all existing refresh tokens for this user (force re-login)
    await RefreshToken.deleteMany({ userId: user._id });

    try {
        await sendPasswordChangedEmail({
            to: user.email,
            name: user.name,
            schoolName: user.schoolId?.name || "School Management System",
            reason: "password reset via email link",
        });
    } catch (notifyError) {
        logger.warn("Failed to send password change notification after reset via link", {
            userId: user._id,
            error: notifyError.message,
        });
    }

    logger.info("Password reset successful", { userId: user._id });

    return { message: "Password has been reset successfully. Please login with your new password." };
};

// RESET PASSWORD (OTP) - Set new password using email + OTP
export const resetPasswordWithOtp = async (email, otp, newPassword) => {
    logger.info("Password reset via OTP attempt", { email });

    if (!email || !otp || !newPassword) {
        throw new BadRequestError("Email, OTP, and new password are required");
    }

    if (newPassword.length < 8) {
        throw new BadRequestError("New password must be at least 8 characters long");
    }

    const user = await User.findOne({ email })
        .select("+password")
        .populate("schoolId", "name");

    if (!user || !user.isActive || user.isArchived) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    const activeResetToken = await PasswordResetToken.findOne({
        userId: user._id,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!activeResetToken) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    if (activeResetToken.otpLockedUntil && activeResetToken.otpLockedUntil > new Date()) {
        throw new UnauthorizedError("Too many invalid OTP attempts. Please request a new reset.");
    }

    const submittedOtpHash = hashToken(otp);
    if (submittedOtpHash !== activeResetToken.otpHash) {
        const nextAttempts = (activeResetToken.otpAttempts || 0) + 1;
        const otpLockedUntil =
            nextAttempts >= MAX_RESET_OTP_ATTEMPTS
                ? new Date(Date.now() + RESET_OTP_LOCK_MINUTES * 60 * 1000)
                : null;

        await PasswordResetToken.findOneAndUpdate(
            { _id: activeResetToken._id, isUsed: false },
            {
                $set: { otpLockedUntil },
                $inc: { otpAttempts: 1 },
            }
        );

        if (otpLockedUntil) {
            throw new UnauthorizedError("Too many invalid OTP attempts. Please request a new reset.");
        }

        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new BadRequestError("New password cannot be the same as your current password");
    }

    const claimedResetToken = await PasswordResetToken.findOneAndUpdate(
        {
            _id: activeResetToken._id,
            isUsed: false,
            expiresAt: { $gt: new Date() },
            otpHash: submittedOtpHash,
            $or: [{ otpLockedUntil: null }, { otpLockedUntil: { $lte: new Date() } }],
        },
        {
            $set: {
                isUsed: true,
                consumedAt: new Date(),
                otpLockedUntil: null,
            },
            $inc: { otpAttempts: 1 },
        },
        { new: true }
    );

    if (!claimedResetToken) {
        throw new UnauthorizedError(INVALID_RESET_CREDENTIALS_MESSAGE);
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    try {
        await sendPasswordChangedEmail({
            to: user.email,
            name: user.name,
            schoolName: user.schoolId?.name || "School Management System",
            reason: "password reset via OTP",
        });
    } catch (notifyError) {
        logger.warn("Failed to send password change notification after reset via OTP", {
            userId: user._id,
            error: notifyError.message,
        });
    }

    logger.info("Password reset via OTP successful", { userId: user._id });
    return { message: "Password has been reset successfully. Please login with your new password." };
};
