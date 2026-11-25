import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared flat config: TypeScript strict rules plus limits that keep files and functions small. */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/generated/**", "**/.output/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
