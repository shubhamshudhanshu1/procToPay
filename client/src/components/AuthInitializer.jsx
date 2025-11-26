import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

const AuthInitializer = ({ children }) => {
  const { isAuthenticated, login } = useAuthStore();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only check once on mount, and only if not authenticated
    // Skip check if we're on auth pages (login, register, verify-otp)
    const isAuthPage = ['/login', '/register', '/verify-otp'].includes(location.pathname);
    
    // Reset hasCheckedRef when user logs out (isAuthenticated becomes false)
    // but only if we're on an auth page (to allow re-checking after logout)
    if (!isAuthenticated && isAuthPage) {
      hasCheckedRef.current = false;
      isCheckingRef.current = false;
    }
    
    if (
      !hasCheckedRef.current &&
      !isCheckingRef.current &&
      !isAuthenticated &&
      !isAuthPage
    ) {
      hasCheckedRef.current = true;
      isCheckingRef.current = true;
      
      // Try to fetch the current user to restore auth state
      authService
        .getCurrentUser()
        .then((user) => {
          // Session exists, restore auth state
          login(user, null);
          isCheckingRef.current = false;
        })
        .catch(() => {
          // No valid session, keep user logged out
          // Error is handled silently as user is not logged in
          isCheckingRef.current = false;
        });
    }
  }, [isAuthenticated, login, location.pathname]);

  return children;
};

export default AuthInitializer;

