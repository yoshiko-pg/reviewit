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

    // Check if this token is a word token (not symbols)
    if (isWordToken(token.content)) {
      const trimmedContent = token.content.trim();
      const isHighlighted = isWordHighlighted(trimmedContent);
      return (
        <span
          key={key}
          {...tokenProps}
          className={`${tokenProps.className || ''} word-token ${isHighlighted ? 'word-highlight' : ''}`}
          data-word={trimmedContent}
        >
          {token.content}
        </span>
      );
    }

    // Not a word token, render as-is
    return <span key={key} {...tokenProps} />;
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
