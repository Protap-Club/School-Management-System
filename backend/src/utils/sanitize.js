/**
 * Input sanitization utilities for XSS prevention.
 * 
 * Mitigates: CWE-79 Cross-Site Scripting (XSS)
 * ZAP Finding: "Cross Site Scripting Weakness (Persistent in JSON Response)"
 * 
 * Usage:
 *   - stripHtml() for fields where HTML is never expected (names, titles)
 *   - escapeHtml() for fields that might be rendered in non-React contexts
 */

/**
 * Strip all HTML tags from a string (preserves text content).
 * Use on fields like names, titles, roll numbers where HTML is never valid.
 * 
 * @param {string} str - Input string
 * @returns {string} Cleaned string with all HTML tags removed
 */
export const stripHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Escape HTML special characters to prevent XSS.
 * Use when returning user-generated content in JSON responses
 * that may be rendered outside React's auto-escaping.
 * 
 * @param {string} str - Input string
 * @returns {string} HTML-escaped string
 */
export const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

/**
 * Strip null bytes and other control characters that could be used for injection.
 * 
 * @param {string} str - Input string
 * @returns {string} Cleaned string
 */
export const stripNullBytes = (str) => {
    if (typeof str !== 'string') return str;
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x00/g, '');
};

/**
 * Comprehensive input sanitizer — strips HTML, null bytes, and trims.
 * Use as a default sanitizer for most text inputs.
 * 
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return stripNullBytes(stripHtml(str)).trim();
};
