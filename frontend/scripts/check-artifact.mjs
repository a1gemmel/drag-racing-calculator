// Verifies the production build is a single self-contained HTML file.
import { readdirSync, readFileSync } from "node:fs";

const distDir = new URL("../dist/", import.meta.url);
const files = readdirSync(distDir);
const failures = [];

if (files.length !== 1 || files[0] !== "index.html") {
  failures.push(`dist/ should contain only index.html, found: ${files.join(", ")}`);
}

const html = readFileSync(new URL("index.html", distDir), "utf8");
if (/<script[^>]+src=|<link[^>]+href=/.test(html)) {
  failures.push("index.html references external scripts or stylesheets");
}
if (!html.includes("Transmission Ratio Viz")) {
  failures.push("index.html does not contain the app name");
}

if (failures.length) {
  console.error(failures.map((failure) => `artifact check failed: ${failure}`).join("\n"));
  process.exit(1);
}
console.log("artifact check passed: dist/index.html is self-contained");
