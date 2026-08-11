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
        // Puppy tab's own warm/playful palette (day mode). Night mode uses `pup.night*`.
        pup: {
          bg: '#FBF4EA',
          card: '#FFFFFF',
          ink: '#4A3B30',
          muted: '#A0917F',
          line: '#EADFD1',
          accent: '#E0894B',
          ok: '#7BA86A',
          amber: '#E0A23B',
          red: '#D8664A',
          sleep: '#2B4C7E',
          awake: '#AFCDEC',
          nightbg: '#161210',
          nightcard: '#221B17',
          nightink: '#F3E9DE',
          nightline: '#342A23',
        },
      },
    },
  },
  plugins: [],
}
