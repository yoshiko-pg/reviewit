import { useEffect, useState } from 'react';
import type { Highlighter } from 'shiki';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

// シンタックスハイライターのキャッシュ
let highlighterCache: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterCache) {
    return highlighterCache;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = import('shiki').then(async ({ getHighlighter }) => {
    const highlighter = await getHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'typescript',
        'javascript', 
        'tsx',
        'jsx',
        'json',
        'css',
        'html',
        'markdown',
        'bash',
        'yaml',
        'python',
        'java',
        'go',
        'rust',
        'cpp',
        'c',
        'php',
        'ruby',
        'swift',
        'kotlin',
        'sql'
      ],
    });
    highlighterCache = highlighter;
    return highlighter;
  });

  return highlighterPromise;
}

// ファイル拡張子から言語を推測
function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'json': 'json',
    'css': 'css',
    'html': 'html',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'sh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
  };

  return extensionMap[ext || ''] || 'text';
}

// グローバル状態でファイル名を管理
let currentFilename: string = '';

export function setCurrentFilename(filename: string) {
  currentFilename = filename;
}

export function SyntaxHighlighter({ code, language, className }: SyntaxHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const highlighter = await getHighlighter();
        
        if (cancelled) return;

        const detectedLang = language || detectLanguageFromFilename(currentFilename);
        
        const highlighted = highlighter.codeToHtml(code, {
          lang: detectedLang,
          theme: 'github-dark'
        });
        
        if (!cancelled) {
          setHighlightedCode(highlighted);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Syntax highlighting failed:', error);
        if (!cancelled) {
          setHighlightedCode(`<pre><code>${escapeHtml(code)}</code></pre>`);
          setIsLoading(false);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (isLoading) {
    return <span className={className}>{code}</span>;
  }

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
      style={{ 
        background: 'transparent',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit'
      }}
    />
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}