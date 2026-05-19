import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'h-bg':     '#0a0a0a',
        'h-dark':   '#111111',
        'h-card':   '#1a1a1a',
        'h-border': '#2a2a2a',
        'h-red':    '#e63329',
        'h-red-d':  '#c0271f',
        'h-muted':  '#6b7280',
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
