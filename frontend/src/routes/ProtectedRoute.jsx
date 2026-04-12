import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const dashboardRoutes = {
  patient: '/book-appointment',
  receptionist: '/receptionist',
  doctor: '/doctor',
  admin: '/admin',
};

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still reading from localStorage on cold load
  if (loading) return <LoadingSpinner fullScreen />;

  // If React state hasn't committed yet but localStorage has the token/user,
  // read it directly to avoid a flash-redirect to /login
  const effectiveUser = user || (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();

  if (!effectiveUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(effectiveUser.role)) {
    return <Navigate to={dashboardRoutes[effectiveUser.role] || '/'} replace />;
  }

  return children;
}
