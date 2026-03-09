import AdminPanel from "./AdminPanel";
import AdminOverview from "../../pages/AdminOverview/AdminOverview";
import AdminCompanies from "../../pages/AdminCompanies/AdminCompanies";
import AdminMarketplace from "../../pages/AdminMarketplace/AdminMarketplace";
import AdminLayout from "../../layout/AdminLayout/AdminLayout";
import AuthGuard from "../../components/AuthGuard/AuthGuard";
import { useAuth } from "../../common/hooks/useAuth";
import { Navigate } from "react-router-dom";

// Component to check if user is superadmin for overview access
const SuperadminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    console.log('SuperadminGuard - Still loading user data...');
    return <div>Loading...</div>;
  }
  
  console.log('SuperadminGuard - User loaded:', user);
  console.log('SuperadminGuard - Superadmin check:', user?.superadmin);
  
  // Check multiple ways to ensure superadmin detection works
  const isSuperadmin = user?.superadmin === true || user?.superadmin === 'true';
  
  if (!isSuperadmin) {
    console.log('SuperadminGuard - NOT SUPERADMIN - Redirecting to /admin/company');
    return <Navigate to="/admin/company" replace />;
  }
  
  console.log('SuperadminGuard - IS SUPERADMIN - Showing children');
  return children;
};

// Component to check if user has admin privileges (ADMIN or SUPERADMIN)
const AdminGuard = ({ children }) => {
  const { user } = useAuth();
  const isMember = user?.role === 'MEMBER';
  
  if (isMember) {
    // Redirect member users to integration library
    return <Navigate to="/integration-library" replace />;
  }
  
  return children;
};

// Component to redirect admin to their company page
const AdminCompanyRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    console.log('AdminCompanyRedirect - Still loading user data...');
    return <div>Loading...</div>;
  }
  
  console.log('AdminCompanyRedirect - User loaded:', user);
  console.log('AdminCompanyRedirect - Superadmin check:', user?.superadmin);
  
  // Check multiple ways to ensure superadmin detection works
  const isSuperadmin = user?.superadmin === true || user?.superadmin === 'true';
  
  if (isSuperadmin) {
    console.log('AdminCompanyRedirect - IS SUPERADMIN - Redirecting to /admin/overview');
    return <Navigate to="/admin/overview" replace />;
  } else {
    console.log('AdminCompanyRedirect - NOT SUPERADMIN - Redirecting to /admin/company');
    return <Navigate to="/admin/company" replace />;
  }
};

const AdminPanelRoutes = [
  {
    path: "admin",
    element: (
      <AuthGuard>
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      </AuthGuard>
    ),
    children: [
      {
        path: "overview",
        element: (
          <SuperadminGuard>
            <AdminOverview />
          </SuperadminGuard>
        )
      },
      {
        path: "companies",
        element: (
          <SuperadminGuard>
            <AdminCompanies />
          </SuperadminGuard>
        )
      },
      {
        path: "marketplace",
        element: (
          <SuperadminGuard>
            <AdminMarketplace />
          </SuperadminGuard>
        )
      },
      {
        path: "company",
        element: <AdminPanel />
      },
      {
        path: "company/:tenantId",
        element: <AdminPanel />
      },
      {
        index: true,
        element: <AdminCompanyRedirect />
      }
    ]
  }
];

export default AdminPanelRoutes;