import React from 'react';

import { useWordHighlight } from '../hooks/useWordHighlight';
import { detectWords } from '../utils/wordDetection';

import { PrismSyntaxHighlighter } from './PrismSyntaxHighlighter';
import type { AppearanceSettings } from './SettingsModal';

interface EnhancedPrismSyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
}

export function EnhancedPrismSyntaxHighlighter({
  code,
  language,
  className,
  syntaxTheme,
}: EnhancedPrismSyntaxHighlighterProps) {
  const { handleMouseOver, handleMouseOut, isWordHighlighted } = useWordHighlight();

  // Detect words in the code
  const words = detectWords(code);

  // Create segments for rendering
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  words.forEach((wordMatch, index) => {
    // Add non-word content before this word
    if (wordMatch.start > lastIndex) {
      segments.push(
        <span key={`text-${index}`}>{code.substring(lastIndex, wordMatch.start)}</span>
      );
    }

    // Add the word with highlighting
    const isHighlighted = isWordHighlighted(wordMatch.word);
    segments.push(
      <span
        key={`word-${index}`}
        className={`word-token ${isHighlighted ? 'word-highlight' : ''}`}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        {wordMatch.word}
      </span>
    );

    lastIndex = wordMatch.end;
  });

  // Add any remaining non-word content
  if (lastIndex < code.length) {
    segments.push(<span key="text-final">{code.substring(lastIndex)}</span>);
  }

  // If no words were found, just render the original code
  if (segments.length === 0) {
    return (
      <PrismSyntaxHighlighter
        code={code}
        language={language}
        className={className}
        syntaxTheme={syntaxTheme}
      />
    );
  }

  // Wrap segments in a container that preserves the original styling
  return <span className={className}>{segments}</span>;
}
