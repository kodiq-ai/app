import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "src-tauri", "src/components/ui"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "unused-imports": unusedImports,
    },
    rules: {
      // ── React ─────────────────────────────────────────────────────
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // ── TypeScript strict ─────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-require-imports": "error",

      // ── Unused imports (auto-fixable) ─────────────────────────────
      "unused-imports/no-unused-imports": "error",

      // ── Code quality ──────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "prefer-arrow-callback": "error",
      "no-param-reassign": "error",
    },
  },

  // ── Type-aware rules (require TS compiler) ──────────────────────
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catch forgotten await — operation silently doesn't execute
      "@typescript-eslint/no-floating-promises": "error",
      // Catch `if (asyncFn())` — always truthy
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Catch `any` leaking into typed code
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      // Type-aware replacements for base rules
      "no-throw-literal": "off",
      "@typescript-eslint/only-throw-error": "error",
      "no-return-await": "off",
      "@typescript-eslint/return-await": "error",
      "require-await": "off",
      "@typescript-eslint/require-await": "error",
    },
  },
  prettier,
);
