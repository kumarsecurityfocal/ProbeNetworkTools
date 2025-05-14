import React from 'react';
import { 
  Wifi as PingIcon,
  Route as TracerouteIcon,
  Search as DnsIcon,
  Globe as HttpIcon,
  Server as ServerIcon
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
  
  // Status color mapping
  const statusColorMap = {
    idle: 'bg-gray-50',
    loading: 'bg-blue-50',
    success: 'bg-green-50',
    error: 'bg-red-50'
  };
  
  const IconComponent = iconMap[icon] || ServerIcon;
  const bgColor = statusColorMap[status] || statusColorMap.idle;
  
  return (
    <div 
      className={`diagnostic-card ${bgColor} ${className} cursor-pointer transform transition-transform hover:scale-105`}
      onClick={onClick}
    >
      <div className="diagnostic-card-header">
        <div className="diagnostic-card-icon">
          <IconComponent size={24} />
        </div>
        <div className="text-right">
          {status === 'loading' && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Running...</span>
          )}
          {status === 'success' && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Success</span>
          )}
          {status === 'error' && (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Error</span>
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      
      <div className="mt-auto pt-2 border-t border-gray-200 flex justify-end">
        <button className="text-sm text-primary-600 font-medium">
          Run Diagnostic
        </button>
      </div>
    </div>
  );
};

export default DiagnosticCard;