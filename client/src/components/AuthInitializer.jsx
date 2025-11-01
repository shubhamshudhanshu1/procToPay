import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

const AuthInitializer = ({ children }) => {
  const { isAuthenticated, login } = useAuthStore();
  const location = useLocation();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only check once on mount, and only if not authenticated
    // Skip check if we're on login or verify-otp pages
    if (
      !hasCheckedRef.current &&
      !isAuthenticated &&
      location.pathname !== '/login' &&
      location.pathname !== '/verify-otp'
    ) {
      hasCheckedRef.current = true;
      
      // Try to fetch the current user to restore auth state
      authService
        .getCurrentUser()
        .then((user) => {
          // Session exists, restore auth state
          login(user, null);
        })
        .catch(() => {
          // No valid session, keep user logged out
          // Error is handled silently as user is not logged in
        });
    }
  }, [isAuthenticated, login, location.pathname]);

  return children;
};

export default AuthInitializer;

