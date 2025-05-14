/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0fa',
          100: '#cce1f5',
          200: '#99c3eb',
          300: '#66a4e1',
          400: '#3386d7',
          500: '#1976d2', // Primary color
          600: '#155fa8',
          700: '#10477e',
          800: '#0a3054',
          900: '#05182a',
        },
        secondary: {
          50: '#fce4ec',
          100: '#f8c9d9',
          200: '#f193b3',
          300: '#ea5c8d',
          400: '#e32667',
          500: '#dc004e', // Secondary color 
          600: '#b0003e',
          700: '#84002f',
          800: '#58001f',
          900: '#2c0010',
        },
        accent: {
          50: '#e6f7f3',
          100: '#ccefe7',
          200: '#99dfcf',
          300: '#66cfb7',
          400: '#33bf9f',
          500: '#00af87', // Accent color
          600: '#008c6c',
          700: '#006951',
          800: '#004636',
          900: '#00231b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
  // This enables using Tailwind alongside MUI
  corePlugins: {
    preflight: false,
  },
}