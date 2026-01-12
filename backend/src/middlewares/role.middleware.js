const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const userRole = req.user.role.toLowerCase();
        const authorized = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!authorized) {
            return res.status(403).json({ success: false, message: `Role ${req.user.role} not authorized` });
        }

        next();
    };
};

export { checkRole };