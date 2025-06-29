import { Highlight, themes } from 'prism-react-renderer';

interface PrismSyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

// Detect language from file extension
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
