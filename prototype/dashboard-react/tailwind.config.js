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
          DEFAULT: '#1976d2',
          50: '#e3f2fd',
          100: '#bbdefb',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
        },
        youtube: '#ff0000',
        instagram: '#e4405f',
        tiktok: '#000000',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}