import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '' }) => {
  // Size mapping - reduced sizes for more subtle appearance
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  // Refined, professional logo with Airtable-inspired styling
  return (
    <div className={`${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background - only for specific variants */}
        {variant === 'dark' ? (
          <rect x="5" y="5" width="90" height="90" rx="20" fill="#2D3142" />
        ) : variant === 'light' ? (
          <rect x="5" y="5" width="90" height="90" rx="20" fill="#FFFFFF" />
        ) : variant === 'bg' ? (
          <rect x="5" y="5" width="90" height="90" rx="20" fill="#F8F9FA" stroke="#E1E3E6" strokeWidth="1.5" />
        ) : null}
        
        {/* Main logo elements - more subtle, Airtable-inspired design */}
        <g>
          {/* Central hub - smaller and more refined */}
          <circle 
            cx="50" 
            cy="50" 
            r="16" 
            fill="#FFFFFF"
            stroke="#4285F4"
            strokeWidth="1.5"
          />
          
          <circle 
            cx="50" 
            cy="50" 
            r="12" 
            fill="url(#subtleGradient)" 
          />
          
          {/* Connection nodes */}
          {/* Top Node */}
          <circle cx="50" cy="20" r="8" fill="#4285F4" opacity="0.9" />
          <circle cx="50" cy="20" r="4" fill="#FFFFFF" />
          
          {/* Right Node */}
          <circle cx="80" cy="50" r="8" fill="#0F9D58" opacity="0.9" />
          <circle cx="80" cy="50" r="4" fill="#FFFFFF" />
          
          {/* Bottom Node */}
          <circle cx="50" cy="80" r="8" fill="#F4B400" opacity="0.9" />
          <circle cx="50" cy="80" r="4" fill="#FFFFFF" />
          
          {/* Left Node */}
          <circle cx="20" cy="50" r="8" fill="#DB4437" opacity="0.9" />
          <circle cx="20" cy="50" r="4" fill="#FFFFFF" />
        </g>
        
        {/* Connecting Lines - more elegant, pastel Airtable style */}
        <g strokeLinecap="round">
          {/* Vertical and horizontal lines */}
          <line x1="50" y1="28" x2="50" y2="42" stroke="#4285F4" strokeWidth="2" opacity="0.7" />
          <line x1="58" y1="50" x2="72" y2="50" stroke="#0F9D58" strokeWidth="2" opacity="0.7" />
          <line x1="50" y1="58" x2="50" y2="72" stroke="#F4B400" strokeWidth="2" opacity="0.7" />
          <line x1="42" y1="50" x2="28" y2="50" stroke="#DB4437" strokeWidth="2" opacity="0.7" />
        </g>
        
        {/* Subtle pulse effect */}
        <circle 
          cx="50" 
          cy="50" 
          r="30" 
          stroke="url(#subtlePulseGradient)" 
          strokeWidth="1" 
          strokeDasharray="2 3" 
          opacity="0.4"
          fill="none"
        />
        
        <defs>
          {/* More subtle, pastel gradient for the center */}
          <radialGradient id="subtleGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(12)">
            <stop offset="0%" stopColor="#E8F0FE" /> {/* Light blue */}
            <stop offset="100%" stopColor="#4285F4" stopOpacity="0.7" />
          </radialGradient>
          
          {/* More subtle pulse gradient */}
          <linearGradient id="subtlePulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4" stopOpacity="0.6" />
            <stop offset="25%" stopColor="#DB4437" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#0F9D58" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#F4B400" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4285F4" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;