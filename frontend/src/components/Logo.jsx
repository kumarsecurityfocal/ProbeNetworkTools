import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '' }) => {
  // Size mapping for logo
  const sizeMap = {
    xs: '16px',
    sm: '24px',
    md: '32px',
    lg: '40px',
    xl: '48px',
    '2xl': '64px',
  };

  const logoHeight = sizeMap[size] || sizeMap.md;
  
  // Recreating the exact logo from the image
  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg 
        height={logoHeight}
        viewBox="0 0 180 40" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Circles container */}
        <g>
          {/* Red Circle (top left) */}
          <circle cx="14" cy="14" r="12" fill="#FF5252" />
          
          {/* Blue Circle (top right) */}
          <circle cx="40" cy="14" r="12" fill="#2196F3" />
          
          {/* Yellow Circle (bottom left) */}
          <circle cx="14" cy="40" r="12" fill="#FFC107" />
          
          {/* Green Circle (bottom right) */}
          <circle cx="40" cy="40" r="12" fill="#4CAF50" />
          
          {/* ProbeOps text */}
          <g transform="translate(60, 27)">
            {/* Probe text in blue */}
            <text 
              fontSize="24" 
              fontFamily="Arial, sans-serif" 
              fontWeight="bold" 
              fill="#2196F3"
            >
              Probe
            </text>
            
            {/* Ops text in green */}
            <text 
              fontSize="24" 
              fontFamily="Arial, sans-serif" 
              fontWeight="bold" 
              fill="#4CAF50"
              x="64"
            >
              Ops
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default Logo;