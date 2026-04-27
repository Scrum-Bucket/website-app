import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  {
    rules: {},
  },
  // folders/files t
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/dist-ssr/**",
    ],
  },

  // base recommended rules
  js.configs.recommended,

  // globals for common environments (ok for most web apps)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // IMPORTANT: keep this LAST so it disables rules that conflict with Prettier
  eslintConfigPrettier,
];
