import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Component and unit tests only; Playwright end to end tests live in ./tests as *.spec.ts.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['components/**/*.test.{ts,tsx}', 'lib/**/*.test.{ts,tsx}'],
  },
})
