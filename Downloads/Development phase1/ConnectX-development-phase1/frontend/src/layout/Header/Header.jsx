import React, { useState } from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../common/hooks/useAuth';
import ThemeToggle from '../../components/ThemeToggle';
import UserProfilePopup from '../../components/UserProfilePopup/UserProfilePopup';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  
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
    <header className="h-20 flex-shrink-0 flex items-center justify-between px-10 sticky top-0 z-50 gap-6" style={{ backgroundColor: 'var(--bg-card)', borderBottomColor: 'var(--border)' }}>
      <div className="flex-1"></div>
      
      <div className="flex items-center gap-6 flex-shrink-0">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl transition-all hover:bg-brand-hover whitespace-nowrap">
          <Bell className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </div>

        <div 
          className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl transition-all hover:bg-brand-hover whitespace-nowrap"
          onClick={() => setIsProfilePopupOpen(true)}
        >
          <div className="flex flex-col items-end">
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{userName}</div>
            <div className="text-xs font-bold uppercase tracking-[0.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{userRole}</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, var(--bg-sidebar), #374151)' }}>
            {userInitials}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <UserProfilePopup 
        isOpen={isProfilePopupOpen} 
        onClose={() => setIsProfilePopupOpen(false)} 
      />
    </header>
  );
};

export default Header;
