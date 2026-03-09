import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../common/hooks/useAuth';
import CompanyOverview from '../../modules/AdminPanel/components/CompanyOverview';

const AdminOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('connectx_token');
  
  const [companies, setCompanies] = useState([]);
  const [oauthUsers, setOauthUsers] = useState([]);
  const [connectorCatalog, setConnectorCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('AdminOverview component is rendering!');

  // Fetch data for the overview
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        
        // Fetch companies
        const companiesRes = await fetch('http://127.0.0.1:8000/admin/companies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);
        }

        // Fetch OAuth users
        const oauthRes = await fetch('http://127.0.0.1:8000/admin/oauth-users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (oauthRes.ok) {
          const oauthData = await oauthRes.json();
          setOauthUsers(oauthData);
        }

        // Fetch connector catalog
        const catalogRes = await fetch('http://127.0.0.1:8000/admin/connector-catalog', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (catalogRes.ok) {
          const catalogData = await catalogRes.json();
          setConnectorCatalog(catalogData);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Overview...</h2>
      </div>
    );
  }

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-[-0.5px]">Superadmin Overview</h1>
        <p className="text-text-muted text-lg font-medium max-w-4xl">
          Superadmin Dashboard - Manage all companies, users, and monitor system health across your enterprise ecosystem.
        </p>
      </div>

      <CompanyOverview 
        companies={companies}
        oauthUsers={oauthUsers}
        connectorCatalog={connectorCatalog}
        onToggleCompanyForm={() => navigate('/admin/companies')}
        setActiveTab={() => navigate('/admin/companies')}
        isSuper={user?.superadmin}
      />

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/admin/companies')}
            className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-b-brand-blue"
          >
            <h3 className="text-lg font-semibold mb-2">Manage Companies</h3>
            <p className="text-text-muted">View and manage all registered companies</p>
          </div>
          <div 
            onClick={() => navigate('/admin/companies')}
            className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-b-success"
          >
            <h3 className="text-lg font-semibold mb-2">User Administration</h3>
            <p className="text-text-muted">Manage user accounts and permissions across all tenants</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
