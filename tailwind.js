/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#7057e8',
          600: '#5b3fd1',
          700: '#4c32b3',
        },
        surface: {
          light: '#F7F8FC',
          card: '#FFFFFF',
          border: '#E6E9F0',
          darkBg: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155'
        }
      }
    },
  },
  plugins: [],
}