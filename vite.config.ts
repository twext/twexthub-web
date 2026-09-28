import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server is the site for `npm run dev`, so it stands in for server.js
// and forwards the whole public /api prefix to whatever upstream the operator
// configured. `TWEXTHUB_API_URL=http://localhost:8080/api/v1 npm run dev` talks
// to that API through the dev server — the loopback the *server* means. A
// build-time URL is honoured too so a static deploy can preview its target.
const DEFAULT_UPSTREAM = 'https://twexts.sdisk.us/api/v1';
const configuredUpstream =
  process.env.TWEXTHUB_API_URL ?? process.env.VITE_TWEXTHUB_API_URL ?? DEFAULT_UPSTREAM;
let proxyTarget = 'https://twexts.sdisk.us';
try {
  proxyTarget = new URL(configuredUpstream).origin;
} catch {
  proxyTarget = new URL(DEFAULT_UPSTREAM).origin;
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Monaco's editor.worker.js is an ESM module worker; emit worker chunks
    // as ES modules so the bundled worker loads correctly.
    worker: {
      format: 'es' as const,
    },
    build: {
      // The lazily loaded Monaco chunk is intentionally large (~3 MB min).
      chunkSizeWarningLimit: 4000,
    },
  };
});
