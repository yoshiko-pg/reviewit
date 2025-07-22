import { Highlight } from 'prism-react-renderer';
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

interface TokenProps {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
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
  console.log('[EnhancedPrismSyntaxHighlighter] Component called with code:', code);
  const { handleMouseOver, handleMouseOut, isWordHighlighted } = useWordHighlight();

  React.useEffect(() => {
    console.log('[EnhancedPrismSyntaxHighlighter] Component mounted/updated');
  }, [code]);

  const detectedLang = language || detectLanguage(currentFilename);
  const { actualLang } = useHighlightedCode(code, detectedLang);
  const theme = getSyntaxTheme(syntaxTheme);

  // Helper function to split token text by word boundaries
  const renderTokenWithWords = (tokenText: string, tokenProps: TokenProps) => {
    const words = detectWords(tokenText);
    console.log('[EnhancedPrismSyntaxHighlighter] renderTokenWithWords:', {
      tokenText,
      wordsFound: words.length,
      words: words.map((w) => w.word),
    });
    if (words.length === 0) {
      return <span {...tokenProps}>{tokenText}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastOffset = 0;

    words.forEach((word: WordMatch, index: number) => {
      // Add text before the word
      if (word.start > lastOffset) {
        parts.push(
          <span key={`before-${index}`} {...tokenProps}>
            {tokenText.substring(lastOffset, word.start)}
          </span>
        );
      }

      // Add the word with highlighting capability
      const isHighlighted = isWordHighlighted(word.word);
      parts.push(
        <span
          key={`word-${index}`}
          {...tokenProps}
          className={`word-token ${isHighlighted ? 'word-highlight' : ''} ${tokenProps.className ?? ''}`}
          data-word={word.word}
        >
          {word.word}
        </span>
      );

      lastOffset = word.end;
    });

    // Add remaining text after the last word
    if (lastOffset < tokenText.length) {
      parts.push(
        <span key="after" {...tokenProps}>
          {tokenText.substring(lastOffset)}
        </span>
      );
    }

    return <>{parts}</>;
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
              {line.map((token, key) => {
                const tokenProps = getTokenProps({ token });
                return (
                  <React.Fragment key={key}>
                    {renderTokenWithWords(token.content, tokenProps)}
                  </React.Fragment>
                );
              })}
            </span>
          ))}
        </span>
      )}
    </Highlight>
  );
}
