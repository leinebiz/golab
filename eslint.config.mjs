// Root ESLint config — lint-staged needs this to exist.
// Actual linting runs per-package via turbo (pnpm lint).
export default [
  {
    ignores: ['**/*'],
  },
];
