// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://luongnv89.github.io',
  base: '/bettersite',
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
});