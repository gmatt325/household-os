/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        puppy: '#C4724A',
        tasks: '#7A6590',
        workouts: '#4A8E72',
        plants: '#6A9A42',
      },
    },
  },
  plugins: [],
}
