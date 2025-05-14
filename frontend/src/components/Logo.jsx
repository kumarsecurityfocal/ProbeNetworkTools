import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '', hideText = false }) => {
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
  
  // Recreating the exact logo from the image as a single word
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
          <circle cx="16" cy="20" r="10" fill="#FF5252" />
          
          {/* Blue Circle (top right) */}
          <circle cx="38" cy="20" r="10" fill="#2196F3" />
          
          {/* Yellow Circle (bottom left) */}
          <circle cx="16" cy="42" r="10" fill="#FFC107" />
          
          {/* Green Circle (bottom right) */}
          <circle cx="38" cy="42" r="10" fill="#4CAF50" />
          
          {/* ProbeOps as a single text element with two colors */}
          {!hideText && (
            <g transform="translate(58, 30)">
              <text 
                fontSize="20" 
                fontFamily="Arial, sans-serif" 
                fontWeight="bold" 
                dominantBaseline="central"
              >
                <tspan fill="#2196F3">Probe</tspan><tspan fill="#4CAF50">Ops</tspan>
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;