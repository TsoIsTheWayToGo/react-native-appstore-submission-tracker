module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ["standard"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "no-console": "off", // Allow console.log for CLI tool
    "prefer-const": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "space-before-function-paren": ["error", "never"],
  },
};
