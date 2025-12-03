import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

const AuthInitializer = ({ children }) => {
  const { restoreSession } = useAuthStore();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only check once per mount cycle
    // Skip check if we're on auth pages (login, register, verify-otp)
    const authPages = ['/login', '/register', '/verify-otp'];
    const isAuthPage = authPages.includes(location.pathname);
    
    if (!hasCheckedRef.current && !isCheckingRef.current && !isAuthPage) {
      hasCheckedRef.current = true;
      isCheckingRef.current = true;
      
      // Try to fetch the current user to restore auth state
      authService
        .getCurrentUser()
        .then((user) => {
          // Session exists, restore auth state
          restoreSession(user);
          isCheckingRef.current = false;
        })
        .catch(() => {
          // No valid session, keep user logged out
          // Error is handled silently as user is not logged in
          isCheckingRef.current = false;
        });
    }
  }, [restoreSession, location.pathname]);

  return children;
};

export default AuthInitializer;

