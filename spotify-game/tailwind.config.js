/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  darkMode: 'class', // Enable dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f0f0f0',
        background2: '#ffffff',
        primary: '#1a202c',
        secondary: '#2d3748',
        accent: '#4a5568',
        txt: "#000000",
        darkBackground2: '#101010',
        darkBackground: '#202020',
        darkPrimary: '#1a202c',
        darkSecondary: '#e2e8f0',
        darkAccent: '#cbd5e0',
        darkTxt: '#cccccc'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      outline: {
        accent: ['2px solid #4a5568', '1px'], // Define outline color and offset
        darkAccent: ['2px solid #cbd5e0', '1px'], // Define outline color and offset
      },
    },
  },
  plugins: [],
});
