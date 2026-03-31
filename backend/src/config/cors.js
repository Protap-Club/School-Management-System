import { conf } from "./index.js";
import logger from "./logger.js";

const normalizeOrigin = (origin = "") => {
    try {
        const url = new URL(origin);
        return `${url.protocol}//${url.host}`.toLowerCase();
    } catch {
        return origin.trim().toLowerCase();
    }
};

const configuredOrigins = new Set(conf.CORS_ORIGINS.map(normalizeOrigin));
const hasWildcard = conf.CORS_ORIGINS.some((origin) => origin.trim() === "*");

if (hasWildcard) {
    const warningMessage = "CORS_ORIGINS contains '*' which is insecure with credentialed requests.";
    if (conf.NODE_ENV === "production") {
        throw new Error(`${warningMessage} Remove wildcard before starting production.`);
    }
    logger.warn(warningMessage);
}

export const isCorsOriginAllowed = (origin) => {
    if (!origin) {
        // Non-browser requests (curl, server-to-server) typically have no Origin header.
        return true;
    }
    return configuredOrigins.has(normalizeOrigin(origin));
};

const originValidator = (origin, callback) => {
    if (isCorsOriginAllowed(origin)) {
        return callback(null, true);
    }

    logger.warn({
        msg: "Blocked by CORS policy",
        origin,
    });
    return callback(new Error("Not allowed by CORS"));
};

export const corsOptions = {
    origin: originValidator,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-platform", "x-device-key"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
};

export const socketCorsOptions = {
    origin: originValidator,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-platform", "x-device-key"],
};

