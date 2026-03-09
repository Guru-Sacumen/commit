import React, { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Navigate, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "@layout/MainLayout";
import AuthGuard from "../components/AuthGuard/AuthGuard";
import { useAuth } from "../common/hooks/useAuth";

import NotFound from "@pages/NotFound/NotFound";
import UserProfile from "@pages/UserProfile/UserProfile";
import IntegrationRoutes from "../modules/Integrationlibrary/Integrationlibrary.routes";
import AdminPanelRoutes from "../modules/AdminPanel/AdminPanel.routes";
import LabValidationRoutes from "../modules/LabValidation/LabValidation.routes";
import AutomatedTestingRoutes from "../modules/AutomatedTesting/AutomatedTesting.routes";
import AgenticMonitorRoutes from "../modules/AgenticMonitor/AgenticMonitor.routes";
import SupportIncidentsRoutes from "../modules/SupportIncidents/SupportIncidents.routes";
import LoginPage from "../pages/Login/LoginPage";

// Component to handle navigation logic inside Router context
const NavigationHandler = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('NavigationHandler - isAuthenticated:', isAuthenticated);
    console.log('NavigationHandler - user:', user);
    console.log('NavigationHandler - location.pathname:', location.pathname);
    
    // If user is authenticated and on login page, redirect based on role
    if (isAuthenticated && location.pathname === '/login') {
      console.log('NavigationHandler - User authenticated on login page, checking role...');
      if (user?.superadmin) {
        console.log('NavigationHandler - Superadmin detected, redirecting to /admin/overview');
        navigate('/admin/overview', { replace: true });
      } else {
        console.log('NavigationHandler - Regular user, redirecting to /integration-library');
        navigate('/integration-library', { replace: true });
      }
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  return null; // This component doesn't render anything
};

// Component to handle default route redirection based on user role
const DefaultRouteRedirect = () => {
  const { user, loading } = useAuth();
  
  console.log('DefaultRouteRedirect - user:', user);
  console.log('DefaultRouteRedirect - loading:', loading);
  
  if (loading) {
    console.log('DefaultRouteRedirect - Still loading...');
    return <div>Loading...</div>;
  }
  
  if (user?.superadmin) {
    console.log('DefaultRouteRedirect - Superadmin, redirecting to /admin/overview');
    return <Navigate to="/admin/overview" replace />;
  } else {
    console.log('DefaultRouteRedirect - Regular user, redirecting to /integration-library');
    return <Navigate to="/integration-library" replace />;
  }
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <>
        <LoginPage />
        <NavigationHandler />
      </>
    ),
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DefaultRouteRedirect />,
      },
      {
        path: "profile",
        element: <UserProfile />,
      },
      ...IntegrationRoutes,
      ...LabValidationRoutes,
      ...AutomatedTestingRoutes,
      ...AgenticMonitorRoutes,
      ...SupportIncidentsRoutes
    ],
  },
  ...AdminPanelRoutes,
  {
    path: "*",
    element: <NotFound />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
