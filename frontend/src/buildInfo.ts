/** Version, commit and changelog baked in at build time (see `define` in vite.config.ts). */

export const REPO_URL = "https://github.com/a1gemmel/drag-racing-calculator";

export const APP_VERSION = __APP_VERSION__;
export const COMMIT_SHA = __COMMIT_SHA__;
export const SHORT_SHA = COMMIT_SHA.slice(0, 7);
export const COMMIT_URL = COMMIT_SHA ? `${REPO_URL}/commit/${COMMIT_SHA}` : null;
export const CHANGELOG = __CHANGELOG__;
