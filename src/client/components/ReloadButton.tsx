import { RotateCcw } from 'lucide-react';

interface ReloadButtonProps {
  shouldReload: boolean;
  isReloading: boolean;
  onReload: () => void;
  changeType?: 'file' | 'commit' | 'staging' | null;
  className?: string;
}

export function ReloadButton({
  shouldReload,
  isReloading,
  onReload,
  changeType,
  className = '',
}: ReloadButtonProps) {
  if (!shouldReload) {
    return null;
  }

  const getChangeMessage = () => {
    switch (changeType) {
      case 'commit':
        return 'New commits available';
      case 'staging':
        return 'Staging changes detected';
      case 'file':
        return 'File changes detected';
      default:
        return 'Changes detected';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'commit':
        return '📝';
      case 'staging':
        return '📋';
      case 'file':
        return '📄';
      default:
        return '🔄';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg shadow-lg">
        <span className="text-sm">{getChangeIcon()}</span>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-blue-900">{getChangeMessage()}</span>
          <span className="text-xs text-blue-600">Click to reload the diff view</span>
        </div>
        <button
          onClick={onReload}
          disabled={isReloading}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
            ${
              isReloading ?
                'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 hover:scale-105'
            }
          `}
          title={isReloading ? 'Reloading...' : 'Reload diff view'}
        >
          <RotateCcw size={14} className={`${isReloading ? 'animate-spin' : ''}`} />
          {isReloading ? 'Loading...' : 'Reload'}
        </button>
      </div>
    </div>
  );
}
