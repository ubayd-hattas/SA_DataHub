import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      // Fixed type scale (docs/DESIGN.md). Use these names for new work.
      fontSize: {
        caption: ['0.8125rem', { lineHeight: '1.25rem' }],
        small: ['0.9375rem', { lineHeight: '1.5rem' }],
        body: ['1.0625rem', { lineHeight: '1.75rem' }],
        lede: ['1.25rem', { lineHeight: '1.9rem' }],
        h3: ['1.375rem', { lineHeight: '1.8rem' }],
        h2: ['1.75rem', { lineHeight: '2.25rem' }],
        h1: ['2.5rem', { lineHeight: '1.15' }],
        figure: ['4rem', { lineHeight: '1' }],
      },
      colors: {
        // Editorial palette: CSS variables switch with the theme.
        paper: 'var(--paper)',
        subtle: 'var(--subtle)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        good: 'var(--good)',
        bad: 'var(--bad)',
        // Brand — deep indigo-green inspired by SA landscape
        brand: {
          50:  '#edfaf4',
          100: '#d3f4e4',
          200: '#aae8cb',
          300: '#72d5ab',
          400: '#39ba85',
          500: '#18a06d',
          600: '#0d8259',
          700: '#0b6848',
          800: '#0c523a',
          900: '#0b4431',
          950: '#04261c',
        },
        // Gold accent — SA sunshine / springbok gold
        gold: {
          300: '#fcd674',
          400: '#f9c231',
          500: '#e8ab10',
          600: '#c98a08',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
