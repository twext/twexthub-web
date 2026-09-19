import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://twexts.sdisk.us',
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
