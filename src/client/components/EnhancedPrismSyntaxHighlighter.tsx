import { type Token } from 'prism-react-renderer';
import React from 'react';

import { useWordHighlight } from '../contexts/WordHighlightContext';
import { detectWords, type WordMatch } from '../utils/wordDetection';

import { PrismSyntaxHighlighter, type PrismSyntaxHighlighterProps } from './PrismSyntaxHighlighter';

type EnhancedPrismSyntaxHighlighterProps = Omit<
  PrismSyntaxHighlighterProps,
  'renderToken' | 'onMouseOver' | 'onMouseOut'
>;

export function EnhancedPrismSyntaxHighlighter(props: EnhancedPrismSyntaxHighlighterProps) {
  const { handleMouseOver, handleMouseOut, isWordHighlighted } = useWordHighlight();

  const renderToken = (
    token: Token,
    key: number,
    getTokenProps: (options: { token: Token }) => Record<string, unknown>
  ) => {
    const tokenProps = getTokenProps({ token });
    const words = detectWords(token.content);

    // If no words detected, render the token as-is
    if (words.length === 0) {
      return <span key={key} {...tokenProps} />;
    }

    // Split the token content into parts (words and non-words)
    const parts: React.ReactNode[] = [];
    let lastOffset = 0;

    words.forEach((word: WordMatch, index: number) => {
      // Add text before the word (punctuation, spaces, etc.)
      if (word.start > lastOffset) {
        parts.push(
          <span key={`${key}-before-${index}`}>
            {token.content.substring(lastOffset, word.start)}
          </span>
        );
      }

      // Add the word with highlighting capability
      const isHighlighted = isWordHighlighted(word.word);
      parts.push(
        <span
          key={`${key}-word-${index}`}
          className={`word-token ${isHighlighted ? 'word-highlight' : ''}`}
          data-word={word.word}
        >
          {word.word}
        </span>
      );

      lastOffset = word.end;
    });

    // Add remaining text after the last word
    if (lastOffset < token.content.length) {
      parts.push(<span key={`${key}-after`}>{token.content.substring(lastOffset)}</span>);
    }

    // Wrap all parts in a span with the original token props (for syntax highlighting)
    return (
      <span key={key} {...tokenProps}>
        {parts}
      </span>
    );
  };

  return (
    <PrismSyntaxHighlighter
      {...props}
      renderToken={renderToken}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    />
  );
}

// Re-export setCurrentFilename from PrismSyntaxHighlighter
export { setCurrentFilename } from './PrismSyntaxHighlighter';
