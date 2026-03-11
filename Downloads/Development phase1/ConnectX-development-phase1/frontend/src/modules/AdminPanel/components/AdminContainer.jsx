import React from 'react';
import ModernAlert from '../../../common/components/ModernAlert';

const AdminContainer = ({ isSuper, children, error, info, onClearMessages }) => {
  return (
    <div className={`admin-container ${isSuper ? 'superadmin-theme' : 'admin-theme'}`}>
      <ModernAlert 
        open={!!error} 
        message={error} 
        severity="error"
        onClose={onClearMessages}
      />
      <ModernAlert 
        open={!!info} 
        message={info} 
        severity="success"
        onClose={onClearMessages}
      />
      {children}
    </div>
  );
};

export default AdminContainer;
