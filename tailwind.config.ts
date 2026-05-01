// Tailwind v4 — config is mostly CSS-first via app/globals.css @theme.
// This file remains so eslint-config-next + tooling that expects it keeps working.
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
} satisfies Config;
