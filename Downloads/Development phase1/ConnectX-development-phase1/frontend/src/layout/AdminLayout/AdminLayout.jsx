import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSideNav from '../AdminSideNav/AdminSideNav';
import Header from '../Header/Header';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-bg-main">
      {/* Admin Sidebar */}
      <AdminSideNav />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-bg-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
