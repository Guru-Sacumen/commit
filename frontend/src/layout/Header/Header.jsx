import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, User } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-50 gap-6 border-b" style={{ backgroundColor: '#ffffff', borderBottomColor: '#e5e7eb' }}>
      <div className="text-sm font-medium" style={{ color: '#6b7280' }}>SecureTech Inc.</div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex items-center justify-center w-[34px] h-[34px] rounded-lg border cursor-pointer" style={{ borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
          <Bell className="w-4 h-4" style={{ color: '#6b7280' }} />
          <span className="absolute -right-1 -top-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: '#7c3aed', border: '2px solid #ffffff' }}>
            7
          </span>
        </div>

        <Link
          to="/profile"
          className="flex items-center justify-center w-[34px] h-[34px] rounded-lg border"
          style={{ borderColor: '#e5e7eb', backgroundColor: '#ffffff', color: '#6b7280' }}
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
