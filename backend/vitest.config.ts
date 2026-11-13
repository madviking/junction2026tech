import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '~encore': path.resolve(import.meta.dirname, 'encore.gen') } },
  test: { include: ['**/*.test.ts'], exclude: ['node_modules', 'encore.gen', '.encore'] },
})
