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

  return (
    <button
      onClick={onReload}
      disabled={isReloading}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${className}
        ${
          isReloading ?
            'bg-orange-700 text-white border-orange-800 cursor-not-allowed'
          : 'bg-orange-700 text-white border-orange-800 hover:bg-orange-800 hover:border-orange-900'
        }
      `}
      title={isReloading ? 'Reloading...' : `${getChangeMessage()} - Click to reload`}
    >
      <RotateCcw size={12} className={`${isReloading ? 'animate-spin' : ''}`} />
      {isReloading ? 'Reloading...' : 'Reload'}
    </button>
  );
}
