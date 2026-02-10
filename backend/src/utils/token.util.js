import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { conf } from "../config/index.js";

// Generate a signed JWT access token (short-lived).

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, conf.JWT_ACCESS_SECRET, { expiresIn: "15m" });
};

// Generate a signed JWT refresh token (long-lived).
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, conf.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

// Verify an access token and return the decoded payload.
export const verifyAccessToken = (token) => {
    return jwt.verify(token, conf.JWT_ACCESS_SECRET);
};

// Verify a refresh token and return the decoded payload.
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, conf.JWT_REFRESH_SECRET);
};

// Hash a token (e.g. refresh token) before storing in DB.
export const hashToken = async (token) => {
    return bcrypt.hash(token, 10);
};

// Compare a plain token against its stored hash.
export const compareToken = async (plainToken, hashedToken) => {
    return bcrypt.compare(plainToken, hashedToken);
};

// Cookie options for the refresh token.
export const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: conf.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
});
