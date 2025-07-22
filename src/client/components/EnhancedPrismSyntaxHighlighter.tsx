import { type Token } from 'prism-react-renderer';

import { useWordHighlight } from '../contexts/WordHighlightContext';
import { isWordToken } from '../utils/wordDetection';

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

    // Split token content by spaces to handle XML/HTML tags that contain multiple words
    const parts = token.content.split(/( +)/);

    // If only one part and it's not a word, render as-is
    if (parts.length === 1 && parts[0] && !isWordToken(parts[0])) {
      return <span key={key} {...tokenProps} />;
    }

    // Render each part, checking if it's a word
    const renderedParts = parts.map((part, index) => {
      // Skip empty parts
      if (!part) return null;

      // Check if this part is a word (not spaces or symbols)
      if (isWordToken(part)) {
        const trimmedPart = part.trim();
        const isHighlighted = isWordHighlighted(trimmedPart);
        return (
          <span
            key={`${key}-${index}`}
            className={`word-token ${isHighlighted ? 'word-highlight' : ''}`}
            data-word={trimmedPart}
          >
            {part}
          </span>
        );
      }

      // Not a word, render as plain text
      return <span key={`${key}-${index}`}>{part}</span>;
    });

    // Wrap all parts in a span with the original token props (for syntax highlighting)
    return (
      <span key={key} {...tokenProps}>
        {renderedParts}
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
