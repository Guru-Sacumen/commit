import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text-main mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text-main mb-4">Page Not Found</h2>
        <p className="text-text-muted mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-brand-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-blue-dark transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
