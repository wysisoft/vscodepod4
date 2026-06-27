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
      // Enable console forwarding (default: true in dev mode)
      enabled: true,

      // Custom API endpoint (default: '/api/debug/client-logs')
      endpoint: "/api/debug/client-logs",

      // Which console levels to forward (default: all)
      levels: ["log", "warn", "error", "info", "debug"],
    }),
  ],
  optimizeDeps: {
    exclude: ['pyodide'],
  },
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
