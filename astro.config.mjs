// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://luongnv.com',
  base: '/bettersite',
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
});