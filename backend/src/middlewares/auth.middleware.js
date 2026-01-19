import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { conf } from "../config/index.js";

const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers?.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, conf.JWT_SECRET);

        const user = await User.findById(decoded.id)
            .select("-password")
            .populate('schoolId', 'name code');

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(401).json({ success: false, message: "Token is not valid" });
    }
};

export { checkAuth };