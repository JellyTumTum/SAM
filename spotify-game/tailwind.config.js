/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");
const themeColours = require('./src/themeColours')

module.exports = withMT({
    mode: 'jit',
    darkMode: 'class', // Enable dark mode
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: themeColours,
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
