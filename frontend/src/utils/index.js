// Utility Functions

// Convert hex color to RGB string
export const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '37 99 235';
};

// Darken a hex color by percentage
export const darkenHex = (hex, percent = 10) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

// Format date for display
export const formatDate = (date, options = {}) => {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
};

// Capitalize first letter of each word
export const capitalizeWords = (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
};

// Extract error message from Axios error objects (Issue #5)
export const readError = (error, fallback = 'Something went wrong') =>
    error?.response?.data?.message || error?.message || fallback;

// Human-readable relative time string (Issue #13)
const TIME_UNITS = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']
];

export const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    for (const [divisor, unit] of TIME_UNITS) {
        const interval = seconds / divisor;
        if (interval > 1) return `${Math.floor(interval)} ${unit}s ago`;
    }
    return 'Just now';
};
