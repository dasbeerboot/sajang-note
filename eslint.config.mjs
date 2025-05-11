import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

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
      // ... 다른 제외할 패턴들 ...
    ],
  },
];

export default eslintConfig;
