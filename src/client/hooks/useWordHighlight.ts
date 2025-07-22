import { useState, useCallback, useRef } from 'react';

import { detectWords, normalizeWord } from '../utils/wordDetection';

const HOVER_DELAY_MS = 200;
const WORD_TOKEN_CLASS = 'word-token';

interface UseWordHighlightReturn {
  highlightedWord: string | null;
  handleMouseOver: (e: React.MouseEvent) => void;
  handleMouseOut: () => void;
  isWordHighlighted: (word: string) => boolean;
}

export function useWordHighlight(): UseWordHighlightReturn {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHighlightTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if target is a word token element
      if (!target.classList.contains(WORD_TOKEN_CLASS)) {
        return;
      }

      clearHighlightTimeout();

      timeoutRef.current = setTimeout(() => {
        const text = target.textContent || '';
        const rect = target.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;

        // Find word at cursor position
        const words = detectWords(text);

        // If only one word in the text, highlight it
        if (words.length === 1 && words[0]) {
          setHighlightedWord(normalizeWord(words[0].word));
          return;
        }

        // For multiple words, calculate position
        const charWidth = rect.width / text.length; // Approximate
        const charIndex = Math.floor(relativeX / charWidth);

        const wordAtCursor = words.find((word) => charIndex >= word.start && charIndex < word.end);

        if (wordAtCursor) {
          setHighlightedWord(normalizeWord(wordAtCursor.word));
        }
      }, HOVER_DELAY_MS);
    },
    [clearHighlightTimeout]
  );

  const handleMouseOut = useCallback(() => {
    clearHighlightTimeout();
    setHighlightedWord(null);
  }, [clearHighlightTimeout]);

  const isWordHighlighted = useCallback(
    (word: string): boolean => {
      if (!highlightedWord) return false;
      return normalizeWord(word) === highlightedWord;
    },
    [highlightedWord]
  );

  return {
    highlightedWord,
    handleMouseOver,
    handleMouseOut,
    isWordHighlighted,
  };
}
