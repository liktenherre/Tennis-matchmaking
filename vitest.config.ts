// Configures fast tests for pure matching and validation rules.

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/features/**/*.ts'],
    },
  },
});
