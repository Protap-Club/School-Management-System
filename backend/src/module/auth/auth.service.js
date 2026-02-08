import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/User.model.js";
import { conf } from "../../config/index.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { CustomError } from "../../utils/customError.js";

// LOGIN
export const login = async (email, password) => {
    if (!email || !password) throw new CustomError("Email and password are required", 400);

    // Fetch user with password (explicitly selected) and populate school info
    const user = await User.findOne({ email }).select('+password').populate('schoolId', 'name code');

    if (!user) throw new CustomError("Invalid credentials", 401);

    // Check account status
    if (!user.isActive) throw new CustomError("Account is deactivated", 403);

    // Restriction: Students cannot access the admin dashboard
    if (user.role === USER_ROLES.STUDENT) throw new CustomError("Access denied for students", 403);

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new CustomError("Invalid credentials", 401);

    // Optimization: Update login time without triggering 'save' hooks
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // Generate Token (Payload includes Role/School to save frontend requests)
    const token = jwt.sign(
        { id: user._id, role: user.role, schoolId: user.schoolId?._id },
        conf.JWT_SECRET,
        { expiresIn: "7d" }
    );

    // Prepare clean response (Exclude password)
    // Prepare restricted response
    const userResponse = {
        name: user.name,
        userid: user._id,
        schoolId: user.schoolId?._id,
        schoolName: user.schoolId?.name,
        email: user.email,
        role: user.role
    };

    return { user: userResponse, token };
};

// LOGOUT (Stateless JWT)
export const logout = async () => {
    return { message: "Logged out successfully" };
};