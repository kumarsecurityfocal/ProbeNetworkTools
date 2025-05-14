import React from 'react';

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend = null, // 'up', 'down', or null
  trendValue = null,
  unit = '', 
  className = '' 
}) => {
  return (
    <div className={`card hover:shadow-card-hover ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
          </div>
          
          {trend && (
            <div className="mt-2 flex items-center">
              {trend === 'up' ? (
                <span className="text-green-600 text-xs font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                  </svg>
                  {trendValue}%
                </span>
              ) : (
                <span className="text-red-600 text-xs font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                  {trendValue}%
                </span>
              )}
              <span className="text-xs text-gray-500 ml-1">vs last week</span>
            </div>
          )}
        </div>
        
        <div className="p-2 rounded-full bg-primary-50 text-primary-600">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;