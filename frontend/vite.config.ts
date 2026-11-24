import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
});