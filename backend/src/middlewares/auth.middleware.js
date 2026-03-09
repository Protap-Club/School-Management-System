import jwt from "jsonwebtoken";
import User from "../module/user/model/User.model.js";
import { conf } from "../config/index.js";
import logger from "../config/logger.js";
import { NotFoundError, UnauthorizedError, ForbiddenError } from "../utils/customError.js";
import { USER_ROLES } from "../constants/userRoles.js";

const checkAuth = async (req, res, next) => {
    try {
        // Extract token safely (optional chaining handles missing headers)
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            throw new UnauthorizedError("Token Not Found!")
        }

        const decoded = jwt.verify(token, conf.JWT_SECRET);
        if (!decoded) {
            throw new UnauthorizedError("Invalid Token");
        }

        // Optimization: .lean() returns a plain JS object instead of a heavy Mongoose document
        const findUser = await User.findById(decoded.id)
            .select("_id name email role schoolId isActive avatarUrl")
            .lean();

        if (!findUser) {
            throw new NotFoundError("User Not Found");
        }

        req.user = findUser;

        // Attach platform from header (default to web)
        req.platform = req.headers["x-platform"] === "mobile" ? "mobile" : "web";
        req.schoolId = findUser.schoolId; // Attach schoolId directly for easier access

        // Mobile Rule Guard
        const MOBILE_ALLOWED_ROLES = [USER_ROLES.TEACHER, USER_ROLES.STUDENT];
        if (req.platform === "mobile" && !MOBILE_ALLOWED_ROLES.includes(req.user.role)) {
            throw new ForbiddenError("Admin access is not available on mobile");
        }
        next();

    } catch (error) {
        // Log errors only (keeps logs clean of "success" noise)
        logger.error(`Auth Middleware Error: ${error.message}`);
        next(error);
    }
};

export { checkAuth };