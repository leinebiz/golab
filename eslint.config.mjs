import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
