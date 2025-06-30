const loaded: Record<string, Promise<void>> = {};

/**
 * Dynamically load a PrismJS language (and its deps) exactly once.
 * Returns a promise that resolves when the grammar has registered itself.
 */
export function loadPrismLanguage(lang: string): Promise<void> {
  if (!loaded[lang]) {
    // Map specific languages to their import paths with dependencies
    const languageImports: Record<string, () => Promise<any>> = {
      bash: () => import('prismjs/components/prism-bash.js'),
      sh: () => import('prismjs/components/prism-bash.js'),
      shell: () => import('prismjs/components/prism-bash.js'),
      php: async () => {
        // PHP requires markup-templating
        await import('prismjs/components/prism-markup-templating.js');
        return import('prismjs/components/prism-php.js');
      },
      sql: () => import('prismjs/components/prism-sql.js'),
      ruby: () => import('prismjs/components/prism-ruby.js'),
      java: () => import('prismjs/components/prism-java.js'),
    };

    const importFn = languageImports[lang];
    if (!importFn) {
      console.warn(`No loader available for language: ${lang}`);
      return Promise.reject(new Error(`Unsupported language: ${lang}`));
    }

    loaded[lang] = importFn()
      .then(() => void 0) // we don't need the export
      .catch((err) => {
        delete loaded[lang]; // allow re-try
        console.warn(`Failed to load language: ${lang}`, err);
        throw err;
      });
  }
  return loaded[lang];
}

/**
 * Check if a language is already loaded
 */
export function isLanguageLoaded(lang: string): boolean {
  return lang in loaded;
}
