import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const FeatureContext = createContext(null);

export const FeatureProvider = ({ children }) => {
    const { user } = useAuth();
    const [features, setFeatures] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatures = async () => {
            // Super admin has no school - skip feature fetch
            if (!user || user.role === 'super_admin') {
                setFeatures({});
                setLoading(false);
                return;
            }

            try {
                // Use the /my-features endpoint that works for any authenticated user
                const response = await api.get('/school/my-features');
                if (response.data.success) {
                    setFeatures(response.data.data.features || {});
                }
            } catch (error) {
                console.error('Failed to fetch school features:', error);
                setFeatures({});
            } finally {
                setLoading(false);
            }
        };

        fetchFeatures();
    }, [user]);

    /**
     * Check if a feature is enabled
     * Super admin bypasses feature checks
     */
    const hasFeature = (featureKey) => {
        // Super admin always has access
        if (user?.role === 'super_admin') return true;
        return features[featureKey] === true;
    };

    /**
     * Refresh features (call after toggling)
     */
    const refreshFeatures = async () => {
        if (!user || user.role === 'super_admin') return;

        try {
            const response = await api.get('/school/my-features');
            if (response.data.success) {
                setFeatures(response.data.data.features || {});
            }
        } catch (error) {
            console.error('Failed to refresh features:', error);
        }
    };

    return (
        <FeatureContext.Provider value={{ features, hasFeature, loading, refreshFeatures }}>
            {children}
        </FeatureContext.Provider>
    );
};

export const useFeatures = () => useContext(FeatureContext);
