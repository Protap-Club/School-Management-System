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
            // Get the current user's school ID
            const currentSchoolId = user?.schoolId?._id || user?.schoolId;

            // If no user or if it's a super admin without a school, skip feature fetch
            if (!user || (user.role === 'super_admin' && !currentSchoolId)) {
                setFeatures({});
                setLoading(false);
                return;
            }

            try {
                // Use the /school/me/features endpoint for the current user's school
                const response = await api.get('/school/me/features');
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
     * Super admin bypasses feature checks unless we want them to see what's enabled for the school
     */
    const hasFeature = (featureKey) => {
        // Super admin always has access but for sidebar visibility we might want to check the actual flag
        // However, the user specifically wants to see features they "turned on", so we check the flag.
        return features[featureKey] === true;
    };

    /**
     * Refresh features (call after toggling)
     */
    const refreshFeatures = async () => {
        const currentSchoolId = user?.schoolId?._id || user?.schoolId;
        if (!user || (user.role === 'super_admin' && !currentSchoolId)) return;

        try {
            const response = await api.get('/school/me/features');
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
