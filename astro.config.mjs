import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

import db from '@astrojs/db';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  env: {
    schema: {
      LOYVERSE_ACCESS_TOKEN: envField.string({ context: 'server', access: 'secret' }),
      ASTRO_DB_REMOTE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    }
  },
  vite: {
    plugins: [tailwindcss()]
  },
  image: {
    remotePatterns: [{ protocol: 'https' }]
  },

  integrations: [react(), db()]
});