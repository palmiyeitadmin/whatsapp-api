/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./functions/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#131d27",
        accent: "#f6e354",
        "background-main": "#F8F9FA",
        surface: "#ffffff",
        "text-primary": "#131d27",
        "text-secondary": "#6C757D",
        "border-color": "#E0E0E0",
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
