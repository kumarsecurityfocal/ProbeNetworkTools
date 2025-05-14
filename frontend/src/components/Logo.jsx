import React from 'react';

const Logo = ({ size = 'md', color = 'primary', className = '' }) => {
  // Size mapping
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  // Color mapping
  const colorMap = {
    primary: 'text-primary-500',
    white: 'text-white',
    dark: 'text-gray-800',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;
  const colorClass = colorMap[color] || colorMap.primary;

  return (
    <div className={`${sizeClass} ${colorClass} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5" />
        
        {/* Inner Network Paths */}
        <path 
          d="M50 20 L50 80" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <path 
          d="M20 50 L80 50" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        
        {/* Pulse waves */}
        <circle 
          cx="50" 
          cy="50" 
          r="15" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeDasharray="3 3" 
        />
        <circle 
          cx="50" 
          cy="50" 
          r="30" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeDasharray="5 5" 
        />
        
        {/* Center point */}
        <circle 
          cx="50" 
          cy="50" 
          r="7" 
          fill="currentColor" 
        />
        
        {/* Connection points */}
        <circle cx="50" cy="20" r="5" fill="currentColor" />
        <circle cx="80" cy="50" r="5" fill="currentColor" />
        <circle cx="50" cy="80" r="5" fill="currentColor" />
        <circle cx="20" cy="50" r="5" fill="currentColor" />
      </svg>
    </div>
  );
};

export default Logo;