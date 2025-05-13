export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**"
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      // 에러로 처리할 규칙들
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      
      // 경고로 처리할 규칙들
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "import/no-anonymous-default-export": "warn"
    }
  }
]; 