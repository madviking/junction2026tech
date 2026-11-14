import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '~encore': path.resolve(import.meta.dirname, 'encore.gen') } },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'encore.gen', '.encore', 'tmp'],
    // All test files share one Encore test database (one content draft row, one
    // live pointer), so files run one after another.
    fileParallelism: false,
  },
})
