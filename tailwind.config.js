/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        card: '#13151f',
        accent: '#7c82ff',
        'accent-light': '#a5a9ff',
        surface: '#1a1d2e',
        border: '#1e2132',
      },
    },
  },
  plugins: [],
}
