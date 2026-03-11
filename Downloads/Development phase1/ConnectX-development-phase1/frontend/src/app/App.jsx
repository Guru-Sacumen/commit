import React, { useState, useEffect } from 'react';
import AppRoutes from './routes';
import { useAuth } from '../common/hooks/useAuth';
import '../styles/global.css';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--text-muted)' }} className="font-medium">Loading ConnectX...</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
}

export default App;
