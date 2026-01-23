import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

// Convert hex to RGB for CSS variable
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '37 99 235'; // Default blue
};

// Darken a hex color for hover states
const darkenHex = (hex, percent = 10) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);

    // Apply theme color to CSS variables
    const applyTheme = (color) => {
        if (!color) return;

        const root = document.documentElement;
        root.style.setProperty('--primary-color', color);
        root.style.setProperty('--primary-rgb', hexToRgb(color));
        root.style.setProperty('--primary-hover', darkenHex(color, 15));
        root.style.setProperty('--primary-hover-rgb', hexToRgb(darkenHex(color, 15)));
    };

    // Fetch branding from API
    const fetchBranding = async () => {
        try {
            const response = await api.get('/school/me/branding');
            if (response.data.success && response.data.data) {
                setBranding(response.data.data);
                // Apply theme color
                if (response.data.data.theme?.accentColor) {
                    applyTheme(response.data.data.theme.accentColor);
                }
            }
        } catch (error) {
            console.error('Failed to fetch branding', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch branding when user logs in
    useEffect(() => {
        if (user) {
            fetchBranding();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Listen for settings updates
    useEffect(() => {
        const handleSettingsUpdate = () => {
            if (user) {
                fetchBranding();
            }
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, [user]);

    // Manually update theme (for immediate UI feedback)
    const updateTheme = (color) => {
        applyTheme(color);
        setBranding(prev => ({
            ...prev,
            theme: { ...prev?.theme, accentColor: color }
        }));
    };

    return (
        <ThemeContext.Provider value={{ branding, loading, updateTheme, fetchBranding }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
