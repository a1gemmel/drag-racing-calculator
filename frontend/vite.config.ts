import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build info shown in the page footer. Version comes from package.json, the changelog from the repo
// root, and the commit from CI (GITHUB_SHA) or the local checkout.
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
function commitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function inlineAssets() {
  return {
    name: "inline-assets",
    enforce: "post" as const,
    generateBundle(
      _options: unknown,
      bundle: Record<string, { type: string; source?: string | Uint8Array; code?: string }>,
    ) {
      const htmlEntry = Object.entries(bundle).find(
        ([fileName, item]) => fileName.endsWith(".html") && item.type === "asset",
      );
      if (!htmlEntry) return;

      const [htmlFileName, htmlAsset] = htmlEntry;
      let html = String(htmlAsset.source ?? "");

      html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_match, sourcePath: string) => {
        const assetName = sourcePath.replace(/^\//, "");
        const script = bundle[assetName];
        if (!script?.code) return _match;
        delete bundle[assetName];
        return `<script type="module">${script.code}</script>`;
      });

      html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_match, sourcePath: string) => {
        const assetName = sourcePath.replace(/^\//, "");
        const stylesheet = bundle[assetName];
        if (!stylesheet?.source) return _match;
        delete bundle[assetName];
        return `<style>${String(stylesheet.source)}</style>`;
      });

      htmlAsset.source = html;
      for (const fileName of Object.keys(bundle)) {
        if (fileName !== htmlFileName) delete bundle[fileName];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineAssets()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __COMMIT_SHA__: JSON.stringify(commitSha()),
    __CHANGELOG__: JSON.stringify(changelog),
  },
  build: {
    // Single-file output: no preload links exist, so drop the polyfill that would fetch them.
    modulePreload: { polyfill: false },
    // Keep everything in one chunk and never emit asset files (small assets are inlined as data: URIs).
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
  },
});