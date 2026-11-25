// Verifies the production build is a single self-contained HTML file: nothing else in dist/, and
// nothing in the page that would load another file (scripts, stylesheets, fonts, images, modules).
import { readdirSync, readFileSync } from "node:fs";

const distDir = new URL("../dist/", import.meta.url);
const files = readdirSync(distDir, { recursive: true });
const failures = [];

if (files.length !== 1 || files[0] !== "index.html") {
  failures.push(`dist/ should contain only index.html, found: ${files.join(", ")}`);
}

const html = readFileSync(new URL("index.html", distDir), "utf8");
const forbidden = [
  [/<script\b[^>]*\bsrc\s*=/i, "an external <script src>"],
  [/<link\b[^>]*>/i, "a <link> tag (stylesheet, preload, icon or font)"],
  [/<(img|iframe|source|video|audio)\b[^>]*\bsrc\s*=\s*["'](?!data:)/i, "an external media src"],
  [/@import\b/i, "a CSS @import"],
  // CSS url() is lowercase and standalone; the lookbehind skips JS like URL.createObjectURL(.
  [/(?<![\w.])url\(\s*["']?(?!data:|#)[^)"'\s]+/, "a CSS url() that isn't a data: URI"],
  [/sourceMappingURL=/, "a source map reference"],
  [/modulepreload/, "the module preload polyfill"],
  [/\bimport\(\s*["'`]/, "a dynamic import()"],
];
for (const [pattern, what] of forbidden) {
  const match = html.match(pattern);
  if (match) failures.push(`index.html contains ${what}: …${html.slice(Math.max(0, match.index - 40), match.index + 60)}…`);
}
if (!html.includes("Drag Racing Calculator")) {
  failures.push("index.html does not contain the app name");
}

if (failures.length) {
  console.error(failures.map((failure) => `artifact check failed: ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`artifact check passed: dist/index.html is self-contained (${Math.round(html.length / 1024)} KB)`);
