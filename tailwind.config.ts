
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Theme Colors
        emerald: { 500: '#10b981', 600: '#059669', 400: '#34d399' },
        indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
        sky: { 500: '#0ea5e9', 600: '#0284c7', 400: '#38bdf8' },
        red: { 500: '#f43f5e', 600: '#e11d48', 400: '#fb7185' },
        amber: { 500: '#f59e0b', 600: '#d97706', 400: '#fbbf24' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        'roboto-slab': ['"Roboto Slab"', 'serif'],
        'lato': ['Lato', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 15px 0 rgba(16, 185, 129, 0.3)',
        'glow-indigo': '0 0 15px 0 rgba(79, 70, 229, 0.4)',
        'glow-red': '0 0 15px 0 rgba(244, 63, 94, 0.3)',
      }
    },
  },
  plugins: [],
}