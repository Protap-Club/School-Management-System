import jwt from "jsonwebtoken";
import User from "../module/user/model/User.model.js";
import { conf } from "../config/index.js";
import logger from "../config/logger.js";

const checkAuth = async (req, res, next) => {
    try {
        // Extract token safely (optional chaining handles missing headers)
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, conf.JWT_SECRET);

        // Optimization: .lean() returns a plain JS object instead of a heavy Mongoose document
        const user = await User.findById(decoded.id)
            .select("-password")
            .lean();

        if (!user) {
            logger.warn(`Auth check failed: User ID ${decoded.id} not found.`);
            return res.status(401).json({ success: false, message: "User not found" });
        }
        user.schoolId = decoded.schoolId;

        req.user = user;
        next();

    } catch (error) {
        // Log errors only (keeps logs clean of "success" noise)
        logger.error(`Auth Middleware Error: ${error.message}`);
        return res.status(401).json({ success: false, message: "Token is not valid or has expired" });
    }
};

export { checkAuth };