import React, { useState, useEffect } from 'react';
import AppRoutes from './routes';
import { useAuth } from '../common/hooks/useAuth';
import '../styles/global.css';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Loading ConnectX...</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
}

export default App;
