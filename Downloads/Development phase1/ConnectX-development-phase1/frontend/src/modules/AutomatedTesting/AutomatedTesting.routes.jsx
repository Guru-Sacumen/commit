import React from 'react';
import { Navigate } from 'react-router-dom';
import AutomatedTesting from "./AutomatedTesting";
import AuthGuard from "../../components/AuthGuard/AuthGuard";
import { useAuth } from "../../common/hooks/useAuth";

// Component to check if user has proper role for automated testing access
const AutomatedTestingGuard = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Superadmin users should only access admin panel, not main dashboard
  if (user?.superadmin) {
    console.log('AutomatedTestingGuard - Superadmin user, redirecting to admin panel');
    return <Navigate to="/admin/overview" replace />;
  }
  
  // Check if user has admin privileges (ADMIN only for main dashboard)
  const isAdmin = user?.role === 'ADMIN';
  
  if (!isAdmin) {
    return <Navigate to="/integration-library" replace />;
  }
  
  return children;
};

const AutomatedTestingRoutes = [
  {
    path: "automated-testing",
    element: (
      <AuthGuard>
        <AutomatedTestingGuard>
          <AutomatedTesting />
        </AutomatedTestingGuard>
      </AuthGuard>
    )
  }
];

export default AutomatedTestingRoutes;