// Copies Monaco's static assets out of node_modules into public/, so the
// editor loads from this app's own origin instead of a CDN. Runs via the
// "postinstall" script in package.json, so every teammate gets it
// automatically after `npm install`/`npm ci` — see src/components/ui/CodeEditor.js
// for why self-hosting matters (a CDN fetch can be blocked by a firewall,
// an ad blocker, or just no internet, which silently breaks the editor).
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(__dirname, "..", "public", "monaco-editor", "vs");

if (!fs.existsSync(src)) {
  console.warn("[copy-monaco] monaco-editor not found in node_modules — skipping.");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[copy-monaco] Copied Monaco editor assets to public/monaco-editor/vs");
