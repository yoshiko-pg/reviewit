import { Highlight, themes } from 'prism-react-renderer';

import { useHighlightedCode } from '../hooks/useHighlightedCode';
import Prism from '../utils/prism';

interface PrismSyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

// Detect language from file extension
function detectLanguage(filename: string): string {
  const basename = filename.split('/').pop()?.toLowerCase() || '';
  const ext = filename.split('.').pop()?.toLowerCase();

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
  };

  return extensionMap[ext || ''] || 'text';
}

let currentFilename = '';

export function setCurrentFilename(filename: string) {
  currentFilename = filename;
}

export function PrismSyntaxHighlighter({ code, language, className }: PrismSyntaxHighlighterProps) {
  const detectedLang = language || detectLanguage(currentFilename);
  const { actualLang } = useHighlightedCode(code, detectedLang);

  return (
    <Highlight code={code} language={actualLang as any} theme={themes.nightOwl} prism={Prism}>
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
