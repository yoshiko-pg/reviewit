import { Highlight, type Token } from 'prism-react-renderer';
import React from 'react';

import { getFileExtension, getFileName } from '../../utils/fileUtils';
import { useWordHighlight } from '../contexts/WordHighlightContext';
import { useHighlightedCode } from '../hooks/useHighlightedCode';
import Prism from '../utils/prism';
import { getSyntaxTheme } from '../utils/syntaxThemes';
import { detectWords, type WordMatch } from '../utils/wordDetection';

import type { AppearanceSettings } from './SettingsModal';

interface EnhancedPrismSyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
  syntaxTheme?: AppearanceSettings['syntaxTheme'];
}

// Detect language from file extension
function detectLanguage(filename: string): string {
  const basename = getFileName(filename).toLowerCase();
  const ext = getFileExtension(filename);

  // Check for special filenames first
  const filenameMap: Record<string, string> = {
    dockerfile: 'docker',
    makefile: 'makefile',
    '.gitignore': 'git',
    '.env': 'bash',
    '.bashrc': 'bash',
    '.zshrc': 'bash',
    '.bash_profile': 'bash',
    '.profile': 'bash',
  };

  if (filenameMap[basename]) {
    return filenameMap[basename];
  }

  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'css',
    html: 'html',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    sql: 'sql',
    xml: 'xml',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    lua: 'lua',
    perl: 'perl',
    dockerfile: 'docker',
    makefile: 'makefile',
    gitignore: 'git',
    env: 'bash',
    conf: 'nginx',
    ini: 'ini',
    toml: 'toml',
    sol: 'solidity',
    vim: 'vim',
    dart: 'dart',
    cs: 'csharp',
  };

  return extensionMap[ext || ''] || 'text';
}

let currentFilename = '';

export function setCurrentFilename(filename: string) {
  currentFilename = filename;
}

export function EnhancedPrismSyntaxHighlighter({
  code,
  language,
  className,
  syntaxTheme = 'vsDark',
}: EnhancedPrismSyntaxHighlighterProps) {
  const { handleMouseOver, handleMouseOut, isWordHighlighted } = useWordHighlight();
  const detectedLang = language || detectLanguage(currentFilename);
  const { actualLang } = useHighlightedCode(code, detectedLang);
  const theme = getSyntaxTheme(syntaxTheme);

  // Helper function to render a token with word detection
  const renderTokenWithWords = (
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
    <Highlight code={code} language={actualLang} theme={theme} prism={Prism}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <span
          className={className}
          style={{ ...style, background: 'transparent', backgroundColor: 'transparent' }}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          {tokens.map((line, i) => (
            <span key={i} {...getLineProps({ line })}>
              {line.map((token, key) => renderTokenWithWords(token, key, getTokenProps))}
            </span>
          ))}
        </span>
      )}
    </Highlight>
  );
}
