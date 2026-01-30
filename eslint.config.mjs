import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  // folders/files to ignore
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'] },

  // base recommended rules
  js.configs.recommended,

  // globals for common environments (ok for most web apps)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // IMPORTANT: keep this LAST so it disables rules that conflict with Prettier
  eslintConfigPrettier,
];
