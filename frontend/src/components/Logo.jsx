import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '' }) => {
  // Size mapping
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  // Modern, colorful logo similar to Airtable's style
  return (
    <div className={`${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle */}
        {variant === 'dark' ? (
          <circle cx="50" cy="50" r="48" fill="#2D3142" />
        ) : variant === 'light' ? (
          <circle cx="50" cy="50" r="48" fill="#FFFFFF" />
        ) : null}
        
        {/* Center network hub with gradient */}
        <circle 
          cx="50" 
          cy="50" 
          r="20" 
          fill="url(#centerGradient)" 
        />
        
        {/* Connection lines with gradient strokes */}
        <g strokeLinecap="round" strokeWidth="3">
          {/* Top connection */}
          <line x1="50" y1="30" x2="50" y2="10" stroke="#4285F4" strokeWidth="4" />
          <circle cx="50" cy="10" r="6" fill="#4285F4" />
          
          {/* Right connection */}
          <line x1="70" y1="50" x2="90" y2="50" stroke="#0F9D58" strokeWidth="4" />
          <circle cx="90" cy="50" r="6" fill="#0F9D58" />
          
          {/* Bottom connection */}
          <line x1="50" y1="70" x2="50" y2="90" stroke="#F4B400" strokeWidth="4" />
          <circle cx="50" cy="90" r="6" fill="#F4B400" />
          
          {/* Left connection */}
          <line x1="30" y1="50" x2="10" y2="50" stroke="#DB4437" strokeWidth="4" />
          <circle cx="10" cy="50" r="6" fill="#DB4437" />
          
          {/* Diagonal top-right */}
          <line x1="64.1" y1="35.9" x2="78.3" y2="21.7" stroke="#4285F4" strokeWidth="3" strokeOpacity="0.8" />
          <circle cx="78.3" cy="21.7" r="5" fill="#4285F4" />
          
          {/* Diagonal bottom-right */}
          <line x1="64.1" y1="64.1" x2="78.3" y2="78.3" stroke="#0F9D58" strokeWidth="3" strokeOpacity="0.8" />
          <circle cx="78.3" cy="78.3" r="5" fill="#0F9D58" />
          
          {/* Diagonal bottom-left */}
          <line x1="35.9" y1="64.1" x2="21.7" y2="78.3" stroke="#F4B400" strokeWidth="3" strokeOpacity="0.8" />
          <circle cx="21.7" cy="78.3" r="5" fill="#F4B400" />
          
          {/* Diagonal top-left */}
          <line x1="35.9" y1="35.9" x2="21.7" y2="21.7" stroke="#DB4437" strokeWidth="3" strokeOpacity="0.8" />
          <circle cx="21.7" cy="21.7" r="5" fill="#DB4437" />
        </g>
        
        {/* Pulse waves */}
        <circle 
          cx="50" 
          cy="50" 
          r="35" 
          stroke="url(#pulseGradient)" 
          strokeWidth="1.5" 
          strokeDasharray="4 4" 
          opacity="0.8"
        />
        
        <defs>
          {/* Center gradient */}
          <radialGradient id="centerGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(20)">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="33%" stopColor="#DB4437" />
            <stop offset="66%" stopColor="#0F9D58" />
            <stop offset="100%" stopColor="#F4B400" />
          </radialGradient>
          
          {/* Pulse gradient */}
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="25%" stopColor="#DB4437" />
            <stop offset="50%" stopColor="#0F9D58" />
            <stop offset="75%" stopColor="#F4B400" />
            <stop offset="100%" stopColor="#4285F4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;