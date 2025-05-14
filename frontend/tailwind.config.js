/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Airtable-inspired color palette
        primary: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#a6c7fa',
          300: '#79a9f7',
          400: '#4d8bf4',
          500: '#4285F4', // Google blue
          600: '#3367d6',
          700: '#2a56c6',
          800: '#1c3aa9',
          900: '#142870',
        },
        secondary: {
          50: '#fde7e7',
          100: '#fcd1d1',
          200: '#f8a3a3',
          300: '#f37676',
          400: '#ef4848',
          500: '#DB4437', // Google red
          600: '#c32f2f',
          700: '#a02626',
          800: '#7e1d1d',
          900: '#5c1414',
        },
        success: {
          50: '#e6f4ea',
          100: '#ceead6',
          200: '#9dd5ac',
          300: '#6dc182',
          400: '#3cac59',
          500: '#0F9D58', // Google green
          600: '#0d904e',
          700: '#0b7842',
          800: '#096035',
          900: '#064828',
        },
        warning: {
          50: '#fef6e0',
          100: '#fdefc1',
          200: '#fbdf83',
          300: '#f9cf45',
          400: '#f7c007',
          500: '#F4B400', // Google yellow
          600: '#dea300',
          700: '#ba8700',
          800: '#956c00',
          900: '#6a4c00',
        },
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        // Dark mode colors
        dark: {
          surface: '#2D3142',
          card: '#3E4159',
          paper: '#4B506A',
          accent: '#6F7695',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif'
        ],
        display: [
          'DM Sans',
          'Inter',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'Roboto Mono',
          'monospace'
        ],
      },
      boxShadow: {
        card: '0 2px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 20px rgba(0, 0, 0, 0.08), 0 5px 12px rgba(0, 0, 0, 0.1)',
        'button': '0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'tooltip': '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      backgroundImage: {
        'gradient-blue': 'linear-gradient(135deg, #4285F4 0%, #0F9D58 100%)',
        'gradient-multi': 'linear-gradient(135deg, #4285F4 0%, #DB4437 33%, #0F9D58 66%, #F4B400 100%)',
      },
    },
  },
  plugins: [],
  // This enables using Tailwind alongside MUI
  corePlugins: {
    preflight: false,
  },
}