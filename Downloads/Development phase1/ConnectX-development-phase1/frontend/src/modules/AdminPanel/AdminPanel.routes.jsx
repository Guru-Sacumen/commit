import AdminPanel from "./AdminPanel";
import AdminOverview from "../../pages/AdminOverview/AdminOverview";
import AdminCompanies from "../../pages/AdminCompanies/AdminCompanies";
import AdminMarketplace from "../../pages/AdminMarketplace/AdminMarketplace";
import AdminLayout from "../../layout/AdminLayout/AdminLayout";
import AuthGuard from "../../components/AuthGuard/AuthGuard";
import { useAuth } from "../../common/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { SupportPortal, TicketList, TicketCreate, TicketDetail } from "../support/pages";

/**
 * SuperadminGuard - Route guard for super admin only access.
 * Redirects non-superadmin users to /admin/company.
 */
const SuperadminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  const isSuperadmin = user?.superadmin === true || user?.superadmin === 'true';
  
  if (!isSuperadmin) {
    return <Navigate to="/admin/company" replace />;
  }
  
  return children;
};

/**
 * AdminGuard - Route guard for admin privileges (ADMIN or SUPERADMIN).
 * Redirects MEMBER users to /integration-library.
 */
const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    console.log('AdminGuard - Still loading user data...');
    return <div>Loading...</div>;
  }
  
  console.log('AdminGuard - User loaded:', user);
  console.log('AdminGuard - User role:', user?.role);
  console.log('AdminGuard - Superadmin check:', user?.superadmin);
  
  // Check if user is authenticated
  if (!user) {
    console.log('AdminGuard - No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has admin privileges (ADMIN or SUPERADMIN)
  const isAdmin = user?.role === 'ADMIN' || user?.superadmin === true || user?.superadmin === 'true';
  
  if (!isAdmin) {
    console.log('AdminGuard - User is not admin, redirecting to integration library');
    // Redirect non-admin users to main dashboard
    return <Navigate to="/integration-library" replace />;
  }
  
  console.log('AdminGuard - User has admin privileges, showing children');
  return children;
};

/**
 * AdminCompanyRedirect - Redirects users based on their role.
 * Superadmin -> /admin/overview, Others -> /admin/company
 */
const AdminCompanyRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  const isSuperadmin = user?.superadmin === true || user?.superadmin === 'true';
  
  if (isSuperadmin) {
    return <Navigate to="/admin/overview" replace />;
  } else {
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
        path: "support",
        element: (
          <SuperadminGuard>
            <SupportPortal />
          </SuperadminGuard>
        )
      },
      {
        path: "support/tickets",
        element: (
          <SuperadminGuard>
            <TicketList />
          </SuperadminGuard>
        )
      },
      {
        path: "support/tickets/new",
        element: (
          <SuperadminGuard>
            <TicketCreate />
          </SuperadminGuard>
        )
      },
      {
        path: "support/tickets/:ticketId",
        element: (
          <SuperadminGuard>
            <TicketDetail />
          </SuperadminGuard>
        )
      },
      {
        index: true,
        element: <AdminCompanyRedirect />
      }
    ]
  }
];

export default AdminPanelRoutes;