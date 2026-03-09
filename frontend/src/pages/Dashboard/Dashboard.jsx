import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../common/hooks/useAuth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.superadmin;

  // All users see the same dashboard content
  const quickActions = [
    { title: 'Integration Library', description: 'Manage your connectors', route: '/integration-library', color: 'bg-brand-blue' },
    { title: 'Lab Validation', description: 'Test your integrations', route: '/lab-validation', color: 'bg-success' },
    { title: 'Automated Testing', description: 'Run regression tests', route: '/automated-testing', color: 'bg-warning' },
    { title: 'Agentic Monitor', description: 'Monitor endpoint health', route: '/agentic-monitor', color: 'bg-danger' },
  ];

  // If superadmin, add admin-specific quick actions
  const allQuickActions = isSuperAdmin ? [
    { title: 'Manage Companies', description: 'View and manage all registered companies', route: '/admin/companies', color: 'bg-purple-500' },
    { title: 'Admin Overview', description: 'View superadmin dashboard and analytics', route: '/admin/overview', color: 'bg-indigo-500' },
    ...quickActions
  ] : quickActions;

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-[-0.5px]">
          {isSuperAdmin ? 'Superadmin Dashboard' : 'Welcome to ConnectX'}
        </h1>
        <p className="text-text-muted text-lg font-medium max-w-4xl">
          {isSuperAdmin 
            ? 'Enterprise Superadmin Console - Manage companies, users, and monitor system health across your ecosystem.'
            : 'Enterprise Console Dashboard - Manage your integrations, monitor health, and ensure seamless connectivity across your ecosystem.'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm border-b-4 border-b-brand-blue">
          <h3 className="text-sm text-brand-blue-dark font-bold mb-3 uppercase tracking-[0.5px]">Total Connectors</h3>
          <div className="text-3xl font-bold text-text-main">24</div>
        </div>
        <div className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm border-b-4 border-b-success">
          <h3 className="text-sm text-text-muted font-bold mb-3 uppercase tracking-[0.5px]">Deployed</h3>
          <div className="text-3xl font-bold text-text-main">18</div>
        </div>
        <div className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm border-b-4 border-b-warning">
          <h3 className="text-sm text-text-muted font-bold mb-3 uppercase tracking-[0.5px]">In Progress</h3>
          <div className="text-3xl font-bold text-text-main">6</div>
        </div>
        <div className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm border-b-4 border-b-info">
          <h3 className="text-sm text-text-muted font-bold mb-3 uppercase tracking-[0.5px]">Health Score</h3>
          <div className="text-3xl font-bold text-text-main">99.4%</div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allQuickActions.map((action, index) => (
            <div
              key={index}
              className="bg-bg-card border border-border-light rounded-xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
              onClick={() => navigate(action.route)}
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg mb-4`}></div>
              <h3 className="text-lg font-bold text-text-main mb-2">{action.title}</h3>
              <p className="text-text-muted text-sm">{action.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
