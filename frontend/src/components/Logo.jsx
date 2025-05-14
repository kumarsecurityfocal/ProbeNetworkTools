import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '', showText = true }) => {
  // Size mapping for logo circles
  const sizeMap = {
    xs: 'h-4',
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
    '2xl': 'h-16',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;
  const textSize = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  }[size] || 'text-base';

  // Using the exact logo from the provided image
  return (
    <div className={`flex items-center ${className}`}>
      {/* Colored circles */}
      <div className={`flex flex-wrap ${sizeClass} w-auto`} style={{ maxWidth: showText ? '2.5rem' : 'auto' }}>
        <svg
          viewBox="0 0 50 22" 
          className="h-full w-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Red Circle (top left) */}
          <circle cx="8" cy="8" r="7" fill="#FF5252" />
          
          {/* Blue Circle (top right) */}
          <circle cx="24" cy="8" r="7" fill="#2196F3" />
          
          {/* Yellow Circle (bottom left) */}
          <circle cx="8" cy="24" r="7" fill="#FFC107" />
          
          {/* Green Circle (bottom right) */}
          <circle cx="24" cy="24" r="7" fill="#4CAF50" />
        </svg>
      </div>
      
      {/* Text "ProbeOps" */}
      {showText && (
        <div className={`ml-2 font-medium ${textSize}`}>
          <span className="text-blue-500">Probe</span>
          <span className="text-green-600">Ops</span>
        </div>
      )}
    </div>
  );
};

export default Logo;