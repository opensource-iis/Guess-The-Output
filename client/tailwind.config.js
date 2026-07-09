/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        term: {
          bg: 'var(--term-bg)',
          green: 'var(--term-green)',
          bright: 'var(--term-green-bright)',
          dim: 'var(--term-green-dim)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        flavor: ['VT323', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
