import React from 'react';

const Logo = ({ size = 'md', variant = 'color', className = '' }) => {
  // Size mapping - smaller sizes to match Airtable's refined logo
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
    '2xl': 'w-20 h-20',
    '3xl': 'w-28 h-28',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  // Minimalist network probe logo inspired directly by Airtable's examples
  return (
    <div className={`${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Minimal central circle with blue pulse */}
        <circle cx="50" cy="50" r="14" fill="#4A89F3" opacity="0.15" />
        <circle cx="50" cy="50" r="10" fill="#4A89F3" />
        
        {/* Dashed guidance circle - very subtle */}
        <circle 
          cx="50" 
          cy="50" 
          r="28" 
          stroke="#DEDEDE" 
          strokeWidth="1" 
          strokeDasharray="2 2" 
          opacity="0.5"
        />
        
        {/* Four probe nodes at cardinal points in Airtable colors */}
        {/* North - Blue */}
        <circle cx="50" cy="15" r="6" fill="#4A89F3" />
        
        {/* East - Green */}
        <circle cx="85" cy="50" r="6" fill="#62C554" />
        
        {/* South - Yellow/Orange */}
        <circle cx="50" cy="85" r="6" fill="#F1CB3A" />
        
        {/* West - Red */}
        <circle cx="15" cy="50" r="6" fill="#EE6352" />
        
        {/* Connection lines to center - clean, minimal */}
        <line x1="50" y1="21" x2="50" y2="40" stroke="#4A89F3" strokeWidth="1.5" />
        <line x1="79" y1="50" x2="60" y2="50" stroke="#62C554" strokeWidth="1.5" />
        <line x1="50" y1="79" x2="50" y2="60" stroke="#F1CB3A" strokeWidth="1.5" />
        <line x1="21" y1="50" x2="40" y2="50" stroke="#EE6352" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export default Logo;