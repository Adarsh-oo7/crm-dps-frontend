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
          DEFAULT: '#00A884',
          dark: '#008069',
          light: 'rgba(0, 168, 132, 0.16)',
        },
        success: '#00A884',
        warning: '#FFB938',
        danger: '#F15C6D',
        info: '#53BDEB',
        sidebar: {
          bg: '#111B21',
          text: '#8696A0',
          active: '#2A3942',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Segoe UI', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
