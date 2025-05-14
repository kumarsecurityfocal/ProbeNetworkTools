import React from 'react';
import { 
  Wifi as PingIcon,
  Route as TracerouteIcon,
  Search as DnsIcon,
  Globe as HttpIcon,
  Server as ServerIcon,
  Play as RunIcon
} from 'lucide-react';

const DiagnosticCard = ({ 
  title, 
  description, 
  icon, 
  onClick,
  status = 'idle', // idle, loading, success, error 
  className = ''
}) => {
  // Map for icon components
  const iconMap = {
    ping: PingIcon,
    traceroute: TracerouteIcon,
    dns: DnsIcon,
    http: HttpIcon,
    server: ServerIcon
  };
  
  // Status color mapping - Airtable inspired pastel colors
  const statusColorMap = {
    idle: 'bg-white',
    loading: 'bg-blue-50',
    success: 'bg-green-50',
    error: 'bg-red-50'
  };
  
  // Status badge styling - Airtable inspired
  const statusBadgeMap = {
    loading: 'bg-blue-100 text-blue-700 border border-blue-200',
    success: 'bg-green-100 text-green-700 border border-green-200',
    error: 'bg-red-100 text-red-700 border border-red-200',
  };
  
  // Icon background colors - Airtable inspired
  const iconBgColorMap = {
    ping: 'bg-indigo-100 text-indigo-600',
    traceroute: 'bg-teal-100 text-teal-600',
    dns: 'bg-purple-100 text-purple-600',
    http: 'bg-blue-100 text-blue-600',
    server: 'bg-orange-100 text-orange-600'
  };
  
  const IconComponent = iconMap[icon] || ServerIcon;
  const bgColor = statusColorMap[status] || statusColorMap.idle;
  const iconBgColor = iconBgColorMap[icon] || 'bg-gray-100 text-gray-600';
  
  return (
    <div 
      className={`${bgColor} ${className} rounded-xl border border-gray-200 p-5 cursor-pointer 
                 hover:shadow-md transition-all duration-300 ease-in-out hover:border-blue-200 
                 flex flex-col h-full`}
      onClick={onClick}
      style={{ 
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
        minHeight: '200px'
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`${iconBgColor} p-2.5 rounded-lg`}>
          <IconComponent size={22} strokeWidth={2} />
        </div>
        
        <div>
          {status !== 'idle' && (
            <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${statusBadgeMap[status]}`}>
              {status === 'loading' && 'Running...'}
              {status === 'success' && 'Success'}
              {status === 'error' && 'Error'}
            </span>
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-800 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 flex-grow">{description}</p>
      
      <div className="mt-auto pt-3 border-t border-gray-100">
        <button 
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <RunIcon size={16} />
          Run Diagnostic
        </button>
      </div>
    </div>
  );
};

export default DiagnosticCard;