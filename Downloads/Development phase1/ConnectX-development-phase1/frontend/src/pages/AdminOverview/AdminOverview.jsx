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
        
        // Fetch companies - use correct superadmin endpoint
        const companiesRes = await fetch('http://127.0.0.1:8000/superadmin/companies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);
        } else {
          console.error('Failed to fetch companies:', companiesRes.status);
        }

        // OAuth users endpoint doesn't exist - set empty array
        setOauthUsers([]);
        setConnectorCatalog([]);
        
      } catch (error) {
        console.error('Error fetching overview data:', error);
        // Set empty arrays on error to prevent UI issues
        setCompanies([]);
        setOauthUsers([]);
        setConnectorCatalog([]);
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
    </div>
  );
};

export default AdminOverview;
