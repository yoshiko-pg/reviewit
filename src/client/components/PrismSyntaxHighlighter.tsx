import { useEffect } from 'react';
import { Highlight, Prism, themes } from 'prism-react-renderer';

interface PrismSyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

// 動的にPrismの言語サポートを追加
function usePrismLanguages() {
  useEffect(() => {
    // Prismをグローバルに公開（動的インポート用）
    (globalThis as any).Prism = Prism;

    // 必要な言語を動的にインポート
    import('prismjs/components/prism-typescript');
    import('prismjs/components/prism-json');
    import('prismjs/components/prism-css');
  }, []);
}

// ファイル拡張子から言語を推測
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'css',
    html: 'html',
  };

  return extensionMap[ext || ''] || 'text';
}

let currentFilename = '';

export function setCurrentFilename(filename: string) {
  currentFilename = filename;
}

export function PrismSyntaxHighlighter({ code, language, className }: PrismSyntaxHighlighterProps) {
  usePrismLanguages();

  const detectedLang = language || detectLanguage(currentFilename);

  return (
    <Highlight code={code} language={detectedLang as any} theme={themes.nightOwl}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <span className={className} style={{ ...style, background: 'transparent' }}>
          {tokens.map((line, i) => (
            <span key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </span>
          ))}
        </span>
      )}
    </Highlight>
  );
}
