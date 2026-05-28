import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Node-runtime files: Vite config + Vercel serverless functions in /api
  // both run under Node, not the browser. Without this override eslint
  // flags every `process.env.*` lookup as "no-undef".
  {
    files: ['vite.config.js', 'api/**/*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
