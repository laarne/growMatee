/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#06111f",
        mint: "#37f5a9",
        ocean: "#38bdf8",
        cobalt: "#2563eb",
      },
      boxShadow: {
        glow: "0 0 70px rgba(56, 189, 248, 0.28)",
        mint: "0 0 70px rgba(55, 245, 169, 0.2)",
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at 20% 10%, rgba(55,245,169,.16), transparent 28%), radial-gradient(circle at 78% 4%, rgba(56,189,248,.18), transparent 24%), linear-gradient(135deg, rgba(6,17,31,1), rgba(4,12,24,1))",
      },
    },
  },
  plugins: [],
};
