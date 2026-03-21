import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/.turbo/**',
  ]),
]);

export default eslintConfig;
