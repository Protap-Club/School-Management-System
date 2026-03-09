import { ForbiddenError } from "../utils/customError.js";


// Middleware that restricts the route to web platform only.
// Must be used AFTER checkAuth (which sets req.platform).
const checkWebOnly = (req, res, next) => {
    if (req.platform === "mobile") {
        throw new ForbiddenError("This action is only available on the web dashboard");
    }
    next();
};

export default checkWebOnly;
