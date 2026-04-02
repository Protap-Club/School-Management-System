import { conf } from "./index.js";

const withUnique = (values) => [...new Set(values.filter(Boolean))];

const cspMode = conf.CSP_MODE;
const cspEnabled = cspMode !== "off";
const cspReportOnly = cspMode === "report-only";

const baseDirectives = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "script-src": ["'self'"],
    "style-src": withUnique([
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        ...conf.CSP_STYLE_SRC,
    ]),
    "font-src": withUnique([
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
        ...conf.CSP_FONT_SRC,
    ]),
    "img-src": withUnique([
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        ...conf.CSP_IMG_SRC,
    ]),
    "connect-src": withUnique([
        "'self'",
        "https://res.cloudinary.com",
        ...conf.CSP_CONNECT_SRC,
    ]),
};

if (conf.NODE_ENV !== "production") {
    baseDirectives["connect-src"] = withUnique([
        ...baseDirectives["connect-src"],
        "ws:",
        "wss:",
        "http:",
        "https:",
    ]);
}

if (conf.CSP_REPORT_URI) {
    baseDirectives["report-uri"] = [conf.CSP_REPORT_URI];
}

if (conf.NODE_ENV === "production") {
    baseDirectives["upgrade-insecure-requests"] = [];
}

export const cspOptions = {
    enabled: cspEnabled,
    reportOnly: cspReportOnly,
    directives: baseDirectives,
};
