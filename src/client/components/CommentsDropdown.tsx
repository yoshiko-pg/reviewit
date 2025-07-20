import { Copy, Eraser, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CommentsDropdownProps {
  commentsCount: number;
  isCopiedAll: boolean;
  onCopyAll: () => void;
  onDeleteAll: () => void;
}

export function CommentsDropdown({
  commentsCount,
  isCopiedAll,
  onCopyAll,
  onDeleteAll,
}: CommentsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAll = () => {
    onCopyAll();
    setIsOpen(false);
  };

  const handleDeleteAll = () => {
    onDeleteAll();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        <button
          onClick={handleCopyAll}
          className="text-xs px-3 py-1.5 pr-2 rounded-l transition-all whitespace-nowrap flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--color-yellow-btn-bg)',
            color: 'var(--color-yellow-btn-text)',
            border: '1px solid var(--color-yellow-btn-border)',
            borderRight: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-hover-bg)';
            e.currentTarget.style.borderColor = 'var(--color-yellow-btn-hover-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-bg)';
            e.currentTarget.style.borderColor = 'var(--color-yellow-btn-border)';
          }}
          title={`Copy all ${commentsCount} comments to AI coding agent`}
        >
          <Copy size={12} />
          {isCopiedAll ? 'Copied All!' : `Copy All Prompt (${commentsCount})`}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs px-2 py-1.5 rounded-r transition-all flex items-center border-l"
          style={{
            backgroundColor: 'var(--color-yellow-btn-bg)',
            color: 'var(--color-yellow-btn-text)',
            borderTop: '1px solid var(--color-yellow-btn-border)',
            borderRight: '1px solid var(--color-yellow-btn-border)',
            borderBottom: '1px solid var(--color-yellow-btn-border)',
            borderLeft: '1px solid var(--color-yellow-btn-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-hover-bg)';
            e.currentTarget.style.borderColor = 'var(--color-yellow-btn-hover-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-yellow-btn-bg)';
            e.currentTarget.style.borderColor = 'var(--color-yellow-btn-border)';
          }}
          title="More options"
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 right-0 bg-github-bg-primary border border-github-border rounded-b z-50 pb-px"
          style={{
            borderTop: 'none',
          }}
        >
          <button
            onClick={handleDeleteAll}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-github-text-primary hover:bg-github-bg-tertiary transition-colors"
          >
            <Eraser size={12} />
            Cleanup All Prompt
          </button>
        </div>
      )}
    </div>
  );
}
