import { defineConfig } from 'vite'
import { consoleForwardPlugin } from "vite-console-forward-plugin";

import { viteStaticCopy } from "vite-plugin-static-copy";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PYODIDE_EXCLUDE = [
  "!**/*.{md,html}",
  "!**/*.d.ts",
  "!**/*.whl",
  "!**/pyodide/node_modules",
];

export function viteStaticCopyPyodide() {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve("pyodide")));
  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, "*").replace(/\\/g, "/")].concat(
          PYODIDE_EXCLUDE
        ),
        dest: "assets",
      },
    ],
  });
}

export default defineConfig({
  plugins: [
    viteStaticCopyPyodide(),
    consoleForwardPlugin({
      enabled: true,
      endpoint: "/api/debug/client-logs",
      levels: ["log", "warn", "error", "info", "debug"],
    }),
  ],
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
