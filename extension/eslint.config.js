import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "@typescript-eslint": tseslint },
    rules: { "@typescript-eslint/no-unused-vars": "error" }
  }
];
