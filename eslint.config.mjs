// Root eslint config — delegates to app-level configs
// Needed because lint-staged runs eslint from the repository root
import webConfig from './apps/web/eslint.config.mjs';

export default webConfig;
