/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: [
    './src/csui/csui-global.html',
    './src/csui/csui-overlay-dark.html',
    './src/csui/csui-overlay-light.html',
    './src/csui/csui-overlay-normal.html',
    './src/csui/csui-popup.html',
    './src/csui/**/*.{vue,js,ts,jsx,tsx}'
  ],
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
}

