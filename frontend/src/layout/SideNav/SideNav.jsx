import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Grid, Box, Activity, DollarSign, MessageSquare, User, Settings, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../common/hooks/useAuth';

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  // Check if user has admin privileges
  const isAdmin = user?.role === 'ADMIN' || user?.superadmin;

  const menuItems = [
    {
      label: 'Enterprise Console',
      items: [
        { id: 'connectors', label: 'Integration Library', icon: Grid, route: '/integration-library' },
        { id: 'lab', label: 'Lab Validation', icon: Box, route: '/lab-validation' },
        { id: 'testing', label: 'Automated Testing', icon: Activity, route: '/automated-testing' },
        { id: 'monitor', label: 'Agentic Monitor', icon: DollarSign, route: '/agentic-monitor' },
        { id: 'support', label: 'Support & Incidents', icon: MessageSquare, route: '/support-incidents' },
      ]
    },
    // Only show Admin section for admin users
    ...(isAdmin ? [{
      label: 'Admin',
      items: [
        { id: 'users', label: 'Users', icon: User, route: '/admin' },
      ]
    }] : [])
  ];

  const bottomMenuItems = [
    { id: 'logout', label: 'Logout', icon: LogOut, route: '/logout' },
  ];

  const isActive = (route) => {
    return location.pathname === route;
  };

  const handleNavClick = (route) => {
    console.log('SideNav - Navigating to:', route);
    if (route === '/logout') {
      // Handle logout logic
      console.log('Logging out...');
      logout();
      navigate('/login');
      return;
    }
    navigate(route);
  };

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col z-100 border-r" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
      <div className="px-4 py-3.5 min-h-[56px] border-b flex items-center gap-2.5" style={{ borderColor: '#e5e7eb' }}>
        <div className="w-9 h-9 rounded-md text-white text-[13px] font-extrabold flex items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>S</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: '#6b7280' }}>Sacumen</span>
          <span className="text-[26px] leading-none font-bold tracking-[-0.4px]" style={{ color: '#111827' }}>
            Connect<span style={{ color: '#7c3aed' }}>X</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <div className="text-[11px] uppercase tracking-[1px] font-bold px-2 mb-2 mt-4" style={{ color: '#6b7280' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`px-2.5 py-2 cursor-pointer flex items-center gap-2.5 text-[14px] font-medium rounded-lg transition-all duration-150 ${
                    isActive(item.route) ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: isActive(item.route) ? '#7c3aed' : '#6b7280',
                    backgroundColor: isActive(item.route) ? '#ede9fe' : 'transparent'
                  }}
                  onClick={() => handleNavClick(item.route)}
                >
                  <Icon className="sidenav-icon w-4 h-4 stroke-2 fill-none flex-shrink-0" style={{ color: isActive(item.route) ? '#7c3aed' : '#6b7280' }} />
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      
      {/* Bottom Navigation */}
      <div className="py-2.5 px-2 border-t" style={{ borderColor: '#e5e7eb' }}>
        {bottomMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="sidenav-item px-2.5 py-2 cursor-pointer flex items-center gap-2.5 text-[13px] font-medium rounded-lg transition-all duration-150"
              style={{ color: '#6b7280' }}
              onClick={() => handleNavClick(item.route)}
            >
              <Icon className="sidenav-icon w-4 h-4 stroke-2 fill-none flex-shrink-0" style={{ color: '#6b7280' }} />
              {item.label}
            </div>
          );
        })}
      </div>
      
      {/* Powered by */}
      <div className="px-4 py-3 text-center border-t" style={{ borderColor: '#e5e7eb' }}>
        <p className="text-[11px]" style={{ color: '#6b7280' }}>Powered by</p>
        <p className="text-[13px] font-bold" style={{ color: '#111827' }}>Sacumen</p>
      </div>
    </aside>
  );
};

export default SideNav;
