/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Inria Serif"', 'Georgia', 'serif'],
      },
      colors: {
        cream: '#f7f5f2',
        brand: {
          pink: '#E91E8C',
          orange: '#FF9F43',
          coral: '#FF6B6B',
          purple: '#A855F7',
          green: '#4ADE80',
          'pink-light': '#FF6B9D',
        },
      },
    },
  },
  plugins: [],
}
