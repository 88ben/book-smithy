/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e6ddd0',
          300: '#d4c7b0',
          400: '#bfaa8c',
          500: '#ae9372',
          600: '#a18163',
          700: '#866a53',
          800: '#6e5747',
          900: '#5a483c',
          950: '#30261f',
        },
        parchment: {
          50: '#fdfcfa',
          100: '#faf7f2',
          200: '#f5efe4',
          300: '#ede3d0',
          400: '#e2d2b8',
          500: '#d5bda0',
        },
        sidebar: {
          DEFAULT: '#1a1a2e',
          hover: '#232340',
          active: '#2d2d50',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
