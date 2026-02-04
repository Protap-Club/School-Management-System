import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatures } from '../state';

const RequireFeature = ({ feature, children }) => {
    const { hasFeature, loading } = useFeatures();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-600"></div>
            </div>
        );
    }

    if (!hasFeature(feature)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default RequireFeature;
