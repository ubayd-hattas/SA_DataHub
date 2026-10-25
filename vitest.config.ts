import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // Next compiles JSX itself (tsconfig `jsx: preserve`); tests that render
  // components need the automatic runtime here.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // DB equivalence tests make real network round-trips to Neon PostgreSQL.
    // 30 s is sufficient for the slowest cold-start connection.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
