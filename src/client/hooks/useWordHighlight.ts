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
      console.log('[useWordHighlight] handleMouseOver', {
        target,
        classList: target.classList.toString(),
        hasWordToken: target.classList.contains(WORD_TOKEN_CLASS),
      });

      // Check if target is a word token element
      if (!target.classList.contains(WORD_TOKEN_CLASS)) {
        console.log('[useWordHighlight] Not a word token, skipping');
        return;
      }

      clearHighlightTimeout();

      timeoutRef.current = setTimeout(() => {
        const text = target.textContent || '';
        const rect = target.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;

        // Find word at cursor position
        const words = detectWords(text);
        console.log('[useWordHighlight] Detected words:', words);

        // If only one word in the text, highlight it
        if (words.length === 1 && words[0]) {
          console.log('[useWordHighlight] Single word, highlighting:', words[0].word);
          setHighlightedWord(normalizeWord(words[0].word));
          return;
        }

        // For multiple words, calculate position
        const charWidth = rect.width / text.length; // Approximate
        const charIndex = Math.floor(relativeX / charWidth);

        const wordAtCursor = words.find((word) => charIndex >= word.start && charIndex < word.end);

        if (wordAtCursor) {
          console.log('[useWordHighlight] Word at cursor:', wordAtCursor.word);
          setHighlightedWord(normalizeWord(wordAtCursor.word));
        } else {
          console.log('[useWordHighlight] No word at cursor position', { charIndex, words });
        }
      }, HOVER_DELAY_MS);
    },
    [clearHighlightTimeout]
  );

  const handleMouseOut = useCallback(() => {
    console.log('[useWordHighlight] handleMouseOut');
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
