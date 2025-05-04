/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#fcd3e1',   // rosado muy claro
          DEFAULT: '#f78fb3', // rosado principal
          dark: '#d46a8c',    // rosado más oscuro
        },
        background: '#fffafc', // fondo rosado-blanco muy claro
      },
      fontFamily: {
        sans: ['"Poppins"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
