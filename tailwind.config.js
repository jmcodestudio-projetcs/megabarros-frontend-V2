/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#1e4481",
          light: "#3598db",
          gold: "#ffd700",
          gray: "#f6f6f6",
        },
      },
    },
  },
  plugins: [],
}