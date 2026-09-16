import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Allow the e2b preview host and any localhost variants so the embedded
  // preview doesn't get blocked by Vite's host check.
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    '.e2b.app',
  ];
  if (process.env.APP_URL) {
    try {
      const url = new URL(process.env.APP_URL);
      if (url.hostname) allowedHosts.push(url.hostname);
    } catch {
      // ignore invalid APP_URL
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts,
      // If someone runs "vite" standalone (not via server.ts), forward /api calls
      // to the Express backend. In server.ts middleware mode this is never reached
      // because Express handles all /api routes before vite.middlewares.
      proxy: {
        '/api': `http://localhost:${process.env.PORT || 3000}`,
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
