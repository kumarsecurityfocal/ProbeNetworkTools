import React from 'react';

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend = null, // 'up', 'down', or null
  trendValue = null,
  unit = '', 
  color = 'blue',
  className = '' 
}) => {
  // Airtable-inspired color schemes
  const colorMap = {
    blue: {
      bgLight: 'bg-blue-50',
      bgIcon: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-100'
    },
    green: {
      bgLight: 'bg-green-50',
      bgIcon: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-100'
    },
    purple: {
      bgLight: 'bg-purple-50',
      bgIcon: 'bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-100'
    },
    indigo: {
      bgLight: 'bg-indigo-50',
      bgIcon: 'bg-indigo-100',
      text: 'text-indigo-600',
      border: 'border-indigo-100'
    },
    teal: {
      bgLight: 'bg-teal-50',
      bgIcon: 'bg-teal-100',
      text: 'text-teal-600',
      border: 'border-teal-100'
    },
    amber: {
      bgLight: 'bg-amber-50',
      bgIcon: 'bg-amber-100',
      text: 'text-amber-600',
      border: 'border-amber-100'
    }
  };
  
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}
      style={{ 
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.25s ease'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
            {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
          </div>
          
          {trend && (
            <div className="mt-3 flex items-center">
              {trend === 'up' ? (
                <span className="text-green-600 text-xs font-medium flex items-center bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                  </svg>
                  {trendValue}%
                </span>
              ) : (
                <span className="text-red-600 text-xs font-medium flex items-center bg-red-50 px-2 py-1 rounded-full border border-red-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                  {trendValue}%
                </span>
              )}
              <span className="text-xs text-gray-500 ml-2">vs last period</span>
            </div>
          )}
        </div>
        
        <div className={`p-2.5 rounded-lg ${colors.bgIcon} ${colors.text}`}>
          {icon}
        </div>
      </div>
      
      {/* Airtable-inspired subtle progress bar */}
      <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors.bgLight} ${colors.border}`} 
          style={{ width: `${Math.min(value, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default MetricCard;