import {defineConfig} from 'vitest/config';
import {svelte} from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({hot: false}) as any],
  test: {
    passWithNoTests: true,
    exclude: ['dist/**', 'node_modules/**'],
  },
});
