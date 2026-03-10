import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check if JWT token is expired
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If token is invalid, consider it expired
    }
  };

  // Function to clear authentication data
  const clearAuth = () => {
    localStorage.removeItem('connectx_token');
    localStorage.removeItem('connectx_tenant_id');
    localStorage.removeItem('connectx_role');
    localStorage.removeItem('connectx_email');
    localStorage.removeItem('connectx_full_name');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    console.log('useAuth useEffect - token exists:', !!token);
    console.log('useAuth useEffect - userData exists:', !!userData);
    console.log('useAuth useEffect - userData:', userData);
    
    if (token && userData) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        clearAuth();
        console.log('useAuth - Token expired, user logged out');
      } else {
        const parsedUserData = JSON.parse(userData);
        console.log('useAuth - Setting user data:', parsedUserData);
        setIsAuthenticated(true);
        setUser(parsedUserData);
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    console.log('useAuth login - userData received:', userData);
    console.log('useAuth login - userData.superadmin:', userData?.superadmin);
    
    // Store using both naming conventions for compatibility
    localStorage.setItem('connectx_token', token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    clearAuth();
  };

  const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken') || null;

  return {
    isAuthenticated,
    user,
    token,
    loading,
    login,
    logout,
  };
};
