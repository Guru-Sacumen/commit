import React from 'react';
import AdminUsersModular from '../../modules/AdminPanel/AdminUsersModular';

const AdminCompanies = () => {
  // This component will render the AdminUsersModular but we need to modify it
  // to show only the companies list without tabs for superadmin
  
  return (
    <div className="p-10">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-[-0.5px]">Companies Management</h1>
        <p className="text-text-muted text-lg font-medium max-w-4xl">
          Manage all registered companies, their users, and system configurations.
        </p>
      </div> */}
      
      {/* Render the companies component without tabs */}
      <AdminUsersModular showOnlyCompanies={true} />
    </div>
  );
};

export default AdminCompanies;
