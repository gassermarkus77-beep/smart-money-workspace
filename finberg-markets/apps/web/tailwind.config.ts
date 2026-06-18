import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo'],
      },
      colors: {
        bg:    { DEFAULT: '#0b0f17', subtle: '#101622', elevated: '#151c2b' },
        text:  { DEFAULT: '#e6ebf2', muted: '#9aa4b2', subtle: '#5f6b7a' },
        accent: { DEFAULT: '#26a69a', hover: '#1f8c80' },
        danger: '#ef5350',
      },
    },
  },
  plugins: [],
};

export default config;
