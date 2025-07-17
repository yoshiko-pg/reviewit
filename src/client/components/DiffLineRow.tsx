import React from 'react';

import { type DiffLine } from '../../types/diff';

import { CommentButton } from './CommentButton';
import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';
import type { AppearanceSettings } from './SettingsModal';

interface DiffLineRowProps {
  line: DiffLine;
  index: number;
  hoveredLine: number | null;
  selectedLineStyle: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: () => void;
  onCommentButtonMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCommentButtonMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => void;
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
}

const getLineClass = (line: DiffLine) => {
  switch (line.type) {
    case 'add':
      return 'bg-diff-addition-bg';
    case 'delete':
      return 'bg-diff-deletion-bg';
    default:
      return 'bg-transparent';
  }
};

const getLinePrefix = (line: DiffLine) => {
  switch (line.type) {
    case 'add':
      return '+';
    case 'delete':
      return '-';
    default:
      return ' ';
  }
};

export const DiffLineRow: React.FC<DiffLineRowProps> = React.memo(
  ({
    line,
    hoveredLine,
    selectedLineStyle,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    onCommentButtonMouseDown,
    onCommentButtonMouseUp,
    syntaxTheme,
  }) => {
    const lineNumber = line.newLineNumber || line.oldLineNumber;
    const showCommentButton = hoveredLine === lineNumber && lineNumber;

    return (
      <tr
        className={`group ${getLineClass(line)} relative ${selectedLineStyle}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top relative">
          {line.oldLineNumber || ''}
        </td>
        <td className="w-[50px] px-2 text-right text-github-text-muted bg-github-bg-secondary border-r border-github-border select-none align-top relative overflow-visible">
          <span className="pr-5">{line.newLineNumber || ''}</span>
          {showCommentButton && (
            <CommentButton
              onMouseDown={onCommentButtonMouseDown}
              onMouseUp={onCommentButtonMouseUp}
            />
          )}
        </td>
        <td className="p-0 w-full relative align-top">
          <div className="flex items-center relative min-h-[16px]">
            <span
              className={`w-5 text-center text-github-text-muted flex-shrink-0 bg-github-bg-secondary border-r border-github-border ${
                line.type === 'add' ? 'text-github-accent bg-diff-addition-bg'
                : line.type === 'delete' ? 'text-github-danger bg-diff-deletion-bg'
                : ''
              }`}
            >
              {getLinePrefix(line)}
            </span>
            <PrismSyntaxHighlighter
              code={line.content}
              className="flex-1 px-3 text-github-text-primary whitespace-pre-wrap break-all overflow-wrap-break-word select-text [&_pre]:m-0 [&_pre]:p-0 [&_pre]:!bg-transparent [&_pre]:font-inherit [&_pre]:text-inherit [&_pre]:leading-inherit [&_code]:!bg-transparent [&_code]:font-inherit [&_code]:text-inherit [&_code]:leading-inherit"
              syntaxTheme={syntaxTheme}
            />
          </div>
        </td>
      </tr>
    );
  }
);

DiffLineRow.displayName = 'DiffLineRow';
