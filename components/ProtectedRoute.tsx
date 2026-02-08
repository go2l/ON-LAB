import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    requiredRole?: 'sampler' | 'lab_admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If a specific role is required
    if (requiredRole) {
        if (requiredRole === 'lab_admin' && role !== 'lab_admin') {
            // User is logged in but doesn't have the admin role -> unauthorized
            return <Navigate to="/" replace />; // Or to an unauthorized page
        }
        // Note: If requiredRole is 'sampler', both 'sampler' and 'lab_admin' should pass.
        // However, my logic in AuthContext defines `isSampler` as true for both.
        // So if using the context helpers is better:
        // if (requiredRole === 'sampler' && !isSampler) ...
        // But for simplicity here with straight role strings:

        if (requiredRole === 'sampler' && role !== 'sampler' && role !== 'lab_admin') {
            return <Navigate to="/" replace />;
        }
    }

    return <Outlet />;
};
