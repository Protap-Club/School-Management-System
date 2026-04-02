import express from "express";
import logger from "../../config/logger.js";

const router = express.Router();

const CSP_REPORT_TYPES = [
    "application/json",
    "application/csp-report",
    "application/reports+json",
];

router.post(
    "/csp-report",
    (req, res, next) => {
        // CSP reports from a different dev origin (e.g. :5173 -> :5000) can be blocked
        // by CORP response checks unless this endpoint is explicitly cross-origin readable.
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    },
    express.json({ type: CSP_REPORT_TYPES, limit: "100kb" }),
    (req, res) => {
        const payload = req.body || {};
        const rawReports = Array.isArray(payload)
            ? payload
            : [payload["csp-report"] || payload];

        rawReports.forEach((entry) => {
            const report = entry?.body || entry;
            if (!report || typeof report !== "object") return;

            logger.warn({
                msg: "CSP violation report",
                documentUri: report["document-uri"] || report.documentURL || null,
                violatedDirective: report["violated-directive"] || report.effectiveDirective || null,
                effectiveDirective: report["effective-directive"] || report.effectiveDirective || null,
                blockedUri: report["blocked-uri"] || report.blockedURL || null,
                sourceFile: report["source-file"] || report.sourceFile || null,
                lineNumber: report["line-number"] || report.lineNumber || null,
                columnNumber: report["column-number"] || report.columnNumber || null,
                disposition: report.disposition || null,
            });
        });

        return res.status(204).end();
    }
);

export default router;
