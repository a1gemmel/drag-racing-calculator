/// <reference types="vite/client" />

/** From package.json "version", e.g. "0.1.0". */
declare const __APP_VERSION__: string;
/** Full SHA of the commit the page was built from ("" if unknown). */
declare const __COMMIT_SHA__: string;
/** Contents of CHANGELOG.md at build time. */
declare const __CHANGELOG__: string;
