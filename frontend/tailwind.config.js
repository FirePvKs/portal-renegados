/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0e0e0e',
          800: '#161616',
          700: '#1c1c1c',
          600: '#222222',
          500: '#2a2a2a'
        },
        bone: {
          50: '#f5f6e8',
          100: '#E0E2C9',
          200: '#cdd0b0',
          300: '#b6b994'
        },
        scroll: {
          DEFAULT: '#8a4a2b',
          dark: '#5a2f1a'
        },
        blood: '#a02828',
        chakra: '#2c79c4'
      },
      fontFamily: {
        display: ['"Russo One"', 'sans-serif'],
        body: ['"Russo One"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'glow-bone': '0 0 20px rgba(224, 226, 201, 0.15)'
      }
    }
  },
  plugins: []
};
