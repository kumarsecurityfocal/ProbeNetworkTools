import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '' }) => {
  // Size mapping for logo
  const sizeMap = {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '56px',
    '2xl': '72px',
  };

  const logoHeight = sizeMap[size] || sizeMap.md;
  
  // Recreating the exact logo from the image with proper spacing
  return (
    <div className={`inline-flex items-center ${className}`} style={{ lineHeight: 0 }}>
      <svg 
        height={logoHeight}
        viewBox="0 0 200 60" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Added padding and adjusted sizing to prevent clipping */}
        <g>
          {/* Red Circle (top left) */}
          <circle cx="14" cy="14" r="10" fill="#FF5252" />
          
          {/* Blue Circle (top right) */}
          <circle cx="36" cy="14" r="10" fill="#2196F3" />
          
          {/* Yellow Circle (bottom left) */}
          <circle cx="14" cy="36" r="10" fill="#FFC107" />
          
          {/* Green Circle (bottom right) */}
          <circle cx="36" cy="36" r="10" fill="#4CAF50" />
          
          {/* ProbeOps text - separated with proper spacing */}
          <g transform="translate(56, 25)">
            {/* Probe text in blue */}
            <text 
              fontSize="20" 
              fontFamily="Arial, sans-serif" 
              fontWeight="bold" 
              fill="#2196F3"
              dominantBaseline="middle"
            >
              Probe
            </text>
            
            {/* Ops text in green - increased spacing */}
            <text 
              fontSize="20" 
              fontFamily="Arial, sans-serif" 
              fontWeight="bold" 
              fill="#4CAF50"
              x="68"
              dominantBaseline="middle"
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