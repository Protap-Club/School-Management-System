/**
 * Extracts the real client IP address from an Express request.
 *
 * With `app.set('trust proxy', 1)` configured on the Express app, `req.ip`
 * already returns the value from `X-Forwarded-For`. This helper adds an
 * explicit fallback chain for belt-and-suspenders safety.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const getClientIp = (req) => {
    // req.ip is the canonical source after trust proxy is configured.
    // X-Forwarded-For may contain a comma-separated list; take the first (leftmost) entry.
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = forwarded ? forwarded.split(',')[0].trim() : null;

    return (
        forwardedIp ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        'unknown'
    );
};
