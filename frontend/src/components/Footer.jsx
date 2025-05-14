import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Logo size="sm" />
            <span className="ml-2 text-gray-700 font-medium">ProbeOps</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex space-x-4 mb-4 md:mb-0 md:mr-8">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-primary-500">Dashboard</Link>
                  <Link to="/diagnostics" className="text-gray-600 hover:text-primary-500">Diagnostics</Link>
                  <Link to="/profile" className="text-gray-600 hover:text-primary-500">Account</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-primary-500">Login</Link>
                  <Link to="/register" className="text-gray-600 hover:text-primary-500">Register</Link>
                </>
              )}
            </div>
            
            <div className="text-gray-500 text-sm">
              © {currentYear} ProbeOps. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;