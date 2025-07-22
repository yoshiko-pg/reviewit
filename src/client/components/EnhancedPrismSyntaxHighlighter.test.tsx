import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EnhancedPrismSyntaxHighlighter } from './EnhancedPrismSyntaxHighlighter';

// Mock PrismSyntaxHighlighter
vi.mock('./PrismSyntaxHighlighter', () => ({
  PrismSyntaxHighlighter: ({ code, className }: any) => <span className={className}>{code}</span>,
}));

// Mock useWordHighlight
const mockUseWordHighlight = vi.fn();
vi.mock('../hooks/useWordHighlight', () => ({
  useWordHighlight: () => mockUseWordHighlight(),
}));

describe('EnhancedPrismSyntaxHighlighter', () => {
  beforeEach(() => {
    mockUseWordHighlight.mockReturnValue({
      highlightedWord: null,
      handleMouseOver: vi.fn(),
      handleMouseOut: vi.fn(),
      isWordHighlighted: vi.fn(() => false),
    });
  });

  it('should render code content', () => {
    render(<EnhancedPrismSyntaxHighlighter code="const hello = world" />);

    expect(screen.getByText(/hello/)).toBeInTheDocument();
    expect(screen.getByText(/world/)).toBeInTheDocument();
  });

  it('should wrap words in spans with word-token class', () => {
    const { container } = render(<EnhancedPrismSyntaxHighlighter code="hello world" />);

    const wordTokens = container.querySelectorAll('.word-token');
    expect(wordTokens).toHaveLength(2);
    expect(wordTokens[0]).toHaveTextContent('hello');
    expect(wordTokens[1]).toHaveTextContent('world');
  });

  it('should highlight words that match the highlighted word', () => {
    mockUseWordHighlight.mockReturnValue({
      highlightedWord: 'hello',
      handleMouseOver: vi.fn(),
      handleMouseOut: vi.fn(),
      isWordHighlighted: vi.fn((word: string) => word.toLowerCase() === 'hello'),
    });

    const { container } = render(<EnhancedPrismSyntaxHighlighter code="hello world Hello" />);

    const highlightedWords = container.querySelectorAll('.word-highlight');
    expect(highlightedWords).toHaveLength(2); // Both "hello" and "Hello"
  });

  it('should call handleMouseOver when hovering a word', () => {
    const handleMouseOver = vi.fn();
    mockUseWordHighlight.mockReturnValue({
      highlightedWord: null,
      handleMouseOver,
      handleMouseOut: vi.fn(),
      isWordHighlighted: vi.fn(() => false),
    });

    const { container } = render(<EnhancedPrismSyntaxHighlighter code="hello world" />);

    const firstWord = container.querySelector('.word-token');
    if (firstWord) {
      fireEvent.mouseOver(firstWord);
      expect(handleMouseOver).toHaveBeenCalled();
    }
  });

  it('should call handleMouseOut when leaving a word', () => {
    const handleMouseOut = vi.fn();
    mockUseWordHighlight.mockReturnValue({
      highlightedWord: null,
      handleMouseOver: vi.fn(),
      handleMouseOut,
      isWordHighlighted: vi.fn(() => false),
    });

    const { container } = render(<EnhancedPrismSyntaxHighlighter code="hello world" />);

    const firstWord = container.querySelector('.word-token');
    if (firstWord) {
      fireEvent.mouseOut(firstWord);
      expect(handleMouseOut).toHaveBeenCalled();
    }
  });

  it('should pass through className prop', () => {
    const { container } = render(
      <EnhancedPrismSyntaxHighlighter code="hello world" className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should handle empty code', () => {
    const { container } = render(<EnhancedPrismSyntaxHighlighter code="" />);

    const wordTokens = container.querySelectorAll('.word-token');
    expect(wordTokens).toHaveLength(0);
  });

  it('should handle code with special characters', () => {
    const { container } = render(<EnhancedPrismSyntaxHighlighter code="hello, world! foo.bar" />);

    const wordTokens = container.querySelectorAll('.word-token');
    expect(wordTokens).toHaveLength(4); // hello, world, foo, bar
  });

  it('should preserve non-word characters', () => {
    render(<EnhancedPrismSyntaxHighlighter code="hello, world!" />);

    expect(screen.getByText(/,/)).toBeInTheDocument();
    expect(screen.getByText(/!/)).toBeInTheDocument();
  });
});
