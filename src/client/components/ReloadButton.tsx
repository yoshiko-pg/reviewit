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
            'bg-github-bg-tertiary text-github-text-secondary border-github-border cursor-not-allowed'
          : 'bg-github-bg-primary text-github-text-primary border-github-border hover:bg-github-bg-tertiary hover:border-github-text-muted'
        }
      `}
      title={isReloading ? 'Reloading...' : `${getChangeMessage()} - Click to reload`}
    >
      <RotateCcw size={12} className={`${isReloading ? 'animate-spin' : ''}`} />
      {isReloading ? 'Reloading...' : 'Reload'}
    </button>
  );
}
