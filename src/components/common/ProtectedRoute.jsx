import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/FirebaseAuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <FontAwesomeIcon 
            icon={['fas', 'spinner']} 
            spin 
            className="text-4xl text-blue-600 mb-4" 
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
