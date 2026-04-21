// Theme Slice - Redux state for theme/branding
import { createSlice } from '@reduxjs/toolkit';

export const DEFAULT_ACCENT_COLOR = '#2563eb';
export const BRANDING_STORAGE_KEY = 'schoolBranding';
export const ACCENT_COLOR_STORAGE_KEY = 'school-accent-color';
export const BRANDING_BROADCAST_STORAGE_KEY = 'school-branding-sync';

// Utility: Convert hex to RGB for CSS variable
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '37 99 235'; // Default blue
};

// Utility: Darken a hex color for hover states
const darkenHex = (hex, percent = 10) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

const canUseStorage = () => typeof window !== 'undefined';

const safeReadJson = (storage, key) => {
    if (!canUseStorage()) return null;
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const safeWriteJson = (storage, key, value) => {
    if (!canUseStorage()) return;
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage write failures and keep runtime state functional.
    }
};

const safeReadValue = (storage, key) => {
    if (!canUseStorage()) return null;
    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
};

const safeWriteValue = (storage, key, value) => {
    if (!canUseStorage()) return;
    try {
        storage.setItem(key, value);
    } catch {
        // Ignore storage write failures and keep runtime state functional.
    }
};

export const extractBrandingSchool = (payload) => {
    if (!payload) return null;
    if (payload.school) return payload.school;
    if (payload.branding) return payload.branding;
    return payload;
};

export const readStoredBranding = () => {
    if (!canUseStorage()) return null;

    const sessionBranding = safeReadJson(window.sessionStorage, BRANDING_STORAGE_KEY);
    if (sessionBranding) return extractBrandingSchool(sessionBranding);

    const broadcastPayload = safeReadJson(window.localStorage, BRANDING_BROADCAST_STORAGE_KEY);
    if (broadcastPayload?.school) return extractBrandingSchool(broadcastPayload.school);

    return null;
};

const persistBranding = (branding) => {
    if (!canUseStorage()) return;

    const school = extractBrandingSchool(branding);
    if (!school) return;

    safeWriteJson(window.sessionStorage, BRANDING_STORAGE_KEY, school);
    safeWriteJson(window.localStorage, BRANDING_BROADCAST_STORAGE_KEY, {
        school,
        ts: Date.now(),
    });

    const accentColor = school.theme?.accentColor || DEFAULT_ACCENT_COLOR;
    safeWriteValue(window.localStorage, ACCENT_COLOR_STORAGE_KEY, accentColor);
};

const persistAccentColor = (color, branding) => {
    if (!canUseStorage()) return;

    const nextColor = color || DEFAULT_ACCENT_COLOR;
    safeWriteValue(window.localStorage, ACCENT_COLOR_STORAGE_KEY, nextColor);

    const school = extractBrandingSchool(branding) || readStoredBranding();
    if (!school) return;

    const nextBranding = {
        ...school,
        theme: {
            ...(school.theme || {}),
            accentColor: nextColor,
        },
    };
    persistBranding(nextBranding);
};

const getInitialAccentColor = () => {
    if (!canUseStorage()) return DEFAULT_ACCENT_COLOR;

    const storedBranding = readStoredBranding();
    if (storedBranding?.theme?.accentColor) {
        return storedBranding.theme.accentColor;
    }

    return safeReadValue(window.localStorage, ACCENT_COLOR_STORAGE_KEY) || DEFAULT_ACCENT_COLOR;
};

const initialState = {
    branding: readStoredBranding(),
    accentColor: getInitialAccentColor(),
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setBranding: (state, action) => {
            const school = extractBrandingSchool(action.payload);
            state.branding = school;
            if (school?.theme?.accentColor) {
                state.accentColor = school.theme.accentColor;
            }
            persistBranding(school);
        },
        setAccentColor: (state, action) => {
            const nextColor = action.payload || DEFAULT_ACCENT_COLOR;
            state.accentColor = nextColor;

            // Sync the color inside the branding object if it exists
            if (state.branding) {
                state.branding = {
                    ...state.branding,
                    theme: {
                        ...(state.branding.theme || {}),
                        accentColor: nextColor,
                    },
                };
            }

            persistAccentColor(nextColor, state.branding);
        },
    },
});

export const { setBranding, setAccentColor } = themeSlice.actions;

// Selectors
export const selectBranding = (state) => state.theme.branding;
export const selectAccentColor = (state) => state.theme.accentColor;
export const selectLogoUrl = (state) => state.theme.branding?.logoUrl;

// Helper function to apply theme to CSS variables (call from components)
export const applyThemeToDOM = (color) => {
    const nextColor = color || DEFAULT_ACCENT_COLOR;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', nextColor);
    root.style.setProperty('--primary-rgb', hexToRgb(nextColor));
    root.style.setProperty('--primary-hover', darkenHex(nextColor, 15));
    root.style.setProperty('--primary-hover-rgb', hexToRgb(darkenHex(nextColor, 15)));

    // Also override shadcn variables so standard tailwind classes (bg-primary) work
    root.style.setProperty('--primary', nextColor);
};

export default themeSlice.reducer;
