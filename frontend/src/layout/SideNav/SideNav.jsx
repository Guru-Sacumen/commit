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
    <aside className="w-[280px] flex-shrink-0 text-white flex flex-col z-100 border-r" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="px-6 py-8 text-2xl font-bold flex items-center tracking-[-0.5px]">
        Connect<span style={{ color: 'var(--brand-primary)' }}>X</span>
      </div>

      <nav className="flex-1 py-2.5 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <div className="text-xs uppercase tracking-[1.5px] font-bold px-6 mb-3 mt-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`mx-3 px-4 py-3 cursor-pointer flex items-center gap-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive(item.route)
                      ? 'font-bold shadow-[inset_3px_0_0_var(--brand-primary)]'
                      : 'hover:bg-brand-hover'
                  }`}
                  style={{
                    color: isActive(item.route) ? '#00B4D8' : '#ffffff',
                    backgroundColor: isActive(item.route) ? 'rgba(0,180,216,0.1)' : 'transparent'
                  }}
                  onClick={() => handleNavClick(item.route)}
                >
                  <Icon className="w-5 h-5 stroke-2 fill-none flex-shrink-0" style={{ color: isActive(item.route) ? '#00B4D8' : '#ffffff' }} />
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      
      {/* Bottom Navigation */}
      <div className="py-2.5" style={{ borderTopColor: 'rgba(255,255,255,0.1)' }}>
        {bottomMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`mx-3 px-4 py-3 cursor-pointer flex items-center gap-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive(item.route)
                  ? 'font-bold shadow-[inset_3px_0_0_var(--brand-primary)]'
                  : 'hover:bg-brand-hover'
              }`}
              style={{
                color: isActive(item.route) ? '#00B4D8' : '#ffffff',
                backgroundColor: isActive(item.route) ? 'rgba(0,180,216,0.1)' : 'transparent'
              }}
              onClick={() => handleNavClick(item.route)}
            >
              <Icon className="w-5 h-5 stroke-2 fill-none flex-shrink-0" style={{ color: isActive(item.route) ? '#00B4D8' : '#ffffff' }} />
              {item.label}
            </div>
          );
        })}
      </div>
      
      {/* Powered by */}
      <div className="px-6 py-4 text-center" style={{ borderTopColor: 'rgba(255,255,255,0.1)' }}>
        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Powered by</p>
        <p className="text-sm font-bold text-white">Sacumen</p>
      </div>
    </aside>
  );
};

export default SideNav;
