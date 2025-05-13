import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "supabase/**/*", // supabase 폴더 및 모든 하위 파일/폴더 제외
      "node_modules/**/*",
      ".next/**/*",
      "public/**/*",
      "scripts/**/*",
      "*.js",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Next.js 15 권장 룰
      "react/react-in-jsx-scope": "off", // React 자동 import 필요 없음
      "react/prop-types": "off", // TypeScript 사용 시 불필요
      "react/jsx-filename-extension": ["warn", { "extensions": [".jsx", ".tsx"] }],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "import/no-anonymous-default-export": "warn",
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      "jsx-a11y/alt-text": "warn",
      "@next/next/no-img-element": "off", // Image 컴포넌트 강제하지 않음
    }
  },
  prettierConfig,
];

export default eslintConfig;
