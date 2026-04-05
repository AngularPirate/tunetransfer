/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFDF7",
          100: "#FFF9E8",
          200: "#FFF3D1",
        },
        sage: {
          400: "#7CB08A",
          500: "#5A9A6A",
          600: "#488A56",
        },
        charcoal: {
          700: "#3D3D3D",
          800: "#2A2A2A",
          900: "#1A1A1A",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in-up-d1": "fade-in-up 0.5s ease-out 0.15s both",
        "fade-in-up-d2": "fade-in-up 0.5s ease-out 0.25s both",
        "fade-in-d1": "fade-in 0.5s ease-out 0.15s both",
        "fade-in-d2": "fade-in 0.5s ease-out 0.3s both",
        "fade-in-d3": "fade-in 0.5s ease-out 0.45s both",
      },
    },
  },
  plugins: [],
};
