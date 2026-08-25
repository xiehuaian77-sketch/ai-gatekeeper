/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090a0f',
          surface: '#0e111a',
          surface2: '#141926',
          border: '#1f273d',
          borderHover: '#00f0ff',
          text: '#f1f5f9',
          muted: '#94a3b8',
          cyan: '#00f0ff',
          neonCyan: '#38bdf8',
          purple: '#a855f7',
          neonPurple: '#c084fc',
          green: '#10b981',
          accent: '#00f0ff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.3)',
        'glow-sm': '0 0 10px -2px rgba(0, 240, 255, 0.25)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        blink: 'blink 1s infinite',
        float: 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body': theme('colors.slate[300]'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-lead': theme('colors.slate[300]'),
            '--tw-prose-links': '#00f0ff',
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-counters': theme('colors.cyan[400]'),
            '--tw-prose-bullets': theme('colors.cyan[400]'),
            '--tw-prose-hr': theme('colors.cyber.border'),
            '--tw-prose-quotes': theme('colors.slate[200]'),
            '--tw-prose-quote-borders': '#00f0ff',
            '--tw-prose-captions': theme('colors.slate[400]'),
            '--tw-prose-code': '#00f0ff',
            '--tw-prose-pre-code': theme('colors.slate[200]'),
            '--tw-prose-pre-bg': '#0e111a',
            '--tw-prose-th-borders': theme('colors.cyber.border'),
            '--tw-prose-td-borders': theme('colors.cyber.border'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
