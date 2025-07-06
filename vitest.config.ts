import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': './src',
      '@/types': './src/types',
    },
  },
});
