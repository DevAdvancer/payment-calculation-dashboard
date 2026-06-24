import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next.config.mjs",
      "test/**",
    ],
  },
];

export default eslintConfig;
