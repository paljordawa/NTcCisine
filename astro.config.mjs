import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

import db from '@astrojs/db';

const { ASTRO_DB_REMOTE_URL, ASTRO_DB_APP_TOKEN } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  env: {
    schema: {
      LOYVERSE_ACCESS_TOKEN: envField.string({ context: 'server', access: 'secret' }),
    }
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      "process.env.ASTRO_DB_REMOTE_URL": JSON.stringify(ASTRO_DB_REMOTE_URL),
      "process.env.ASTRO_DB_APP_TOKEN": JSON.stringify(ASTRO_DB_APP_TOKEN),
    }
  },
  image: {
    remotePatterns: [{ protocol: 'https' }]
  },

  integrations: [react(), db({ mode: 'web' })]
});