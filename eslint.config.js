const tsParser = require("@typescript-eslint/parser");
const eslintPluginTypescript = require("@typescript-eslint/eslint-plugin");
const eslintPluginReact = require("eslint-plugin-react");
const eslintPluginPrettier = require("eslint-plugin-prettier");
const eslintPluginImport = require("eslint-plugin-import");
const eslintPluginJsxA11y = require("eslint-plugin-jsx-a11y");

module.exports = [
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["node_modules", "dist", "build"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: false
        },
      }
    },
    plugins: {
      "@typescript-eslint": eslintPluginTypescript,
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "import/order": [
        "error",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always"
        }
      ]
    },
    settings: {
      react: {
        version: "detect"
      },
      "import/resolver": {
        typescript: true
      }
    }
  }
];
