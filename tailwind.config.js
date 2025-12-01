/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#000000',
        'dark-card': '#0A0A0A',
        'dark-border': '#1F1F1F',
        'dark-text': '#FFFFFF',
        'dark-text-secondary': '#A3A3A3',
      },
    },
  },
  plugins: [],
}

