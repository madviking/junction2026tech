// Flat config (ESLint 9). Errors fail the readiness gate; changed files must also be warning-free.
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPerf from 'eslint-plugin-react-perf'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import noCrossFeatureImports from './eslint-rules/no-cross-feature-imports.js'
import noLocalApiContractTypes from './eslint-rules/no-local-api-contract-types.js'
import noRawStyles from './eslint-rules/no-raw-styles.js'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'test-results', 'playwright-report', 'src/shared/api/client.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 'latest', globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-perf': reactPerf,
      local: {
        rules: {
          'no-cross-feature-imports': noCrossFeatureImports,
          'no-local-api-contract-types': noLocalApiContractTypes,
          'no-raw-styles': noRawStyles,
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'react-perf/jsx-no-new-array-as-prop': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Repo policies (see .codex/skills/frontend-standards/SKILL.md)
      'local/no-cross-feature-imports': 'error',
      'local/no-local-api-contract-types': 'error',
      'local/no-raw-styles': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['axios'], message: 'Use @/shared/api/api (the generated Encore client).' },
            { group: ['../../*'], message: 'Use the @/ alias instead of deep relative imports.' },
          ],
        },
      ],
      'no-restricted-properties': [
        'warn',
        { object: 'window', property: 'localStorage', message: 'Product data belongs in the backend.' },
        { object: 'window', property: 'sessionStorage', message: 'Product data belongs in the backend.' },
      ],
      'no-restricted-globals': [
        'warn',
        { name: 'localStorage', message: 'Product data belongs in the backend.' },
        { name: 'sessionStorage', message: 'Product data belongs in the backend.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: { 'react-perf/jsx-no-new-object-as-prop': 'off', 'react-perf/jsx-no-new-array-as-prop': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'eslint-rules/**', 'e2e/**'],
    languageOptions: { globals: globals.node },
  },
)
