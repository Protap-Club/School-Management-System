// Theme Slice - Redux state for theme/branding
import { createSlice } from '@reduxjs/toolkit';

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

const initialState = {
    branding: null,
    accentColor: '#2563eb',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setBranding: (state, action) => {
            state.branding = action.payload;
            if (action.payload?.theme?.accentColor) {
                state.accentColor = action.payload.theme.accentColor;
            }
        },
        setAccentColor: (state, action) => {
            state.accentColor = action.payload;
            if (state.branding) {
                state.branding.theme = { ...state.branding?.theme, accentColor: action.payload };
            }
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
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', color);
    root.style.setProperty('--primary-rgb', hexToRgb(color));
    root.style.setProperty('--primary-hover', darkenHex(color, 15));
    root.style.setProperty('--primary-hover-rgb', hexToRgb(darkenHex(color, 15)));
};

export default themeSlice.reducer;
