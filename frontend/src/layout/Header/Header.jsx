import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../common/hooks/useAuth';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Extract user information from different possible field names
  const getUserName = (user) => {
    if (!user) return 'Global Superadmin';
    return user.name || user.full_name || user.username || user.email || 'User';
  };
  
  const getUserRole = (user) => {
    if (!user) return 'SUPERADMIN';
    return user.role || (user.superadmin ? 'SUPERADMIN' : 'ADMIN');
  };
  
  // Fallback user data if auth user is not available
  const currentUser = user || {
    name: 'Global Superadmin',
    role: 'SUPERADMIN',
    initials: 'GS'
  };

  // Use dynamic user data
  const userName = getUserName(user);
  const userRole = getUserRole(user);

  // Generate initials from name if not provided
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userInitials = currentUser.initials || getInitials(userName);

  return (
    <header className="h-20 flex-shrink-0 bg-bg-card border-b border-border-light flex items-center justify-between px-10 sticky top-0 z-50 gap-6">
      <div className="flex-1"></div>
      
      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl transition-all hover:bg-bg-page hover:shadow-[inset_0_0_0_1px_var(--border-light)]">
          <Bell className="w-5 h-5 text-text-muted" />
        </div>

        <div 
          className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl transition-all hover:bg-bg-page hover:shadow-[inset_0_0_0_1px_var(--border-light)] whitespace-nowrap"
        >
          <div className="flex flex-col items-end">
            <div className="text-sm font-bold text-text-main leading-tight">{userName}</div>
            <div className="text-xs font-bold text-text-muted uppercase tracking-[0.5px] mt-0.5">{userRole}</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-sidebar-bg to-gray-800 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            {userInitials}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;
