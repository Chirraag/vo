/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        primary: ["Taurusgroteskroman Vf", "Apple UI", "Lato", "sans-serif"],
        display: ["Taurusgroteskroman Vf", "Apple UI", "Outfit", "sans-serif"],
      },
      colors: {
        custom: {
          primary: "#ca061b",
          orange: "#ff5900",
          purple: "#5f007d",
          yellow: "#f9a901",
        },
        offwhite: "#faf9f6",
      },
      backgroundColor: {
        primary: "#000000",
        secondary: "#faf9f6", // Changed from #ffffff to #faf9f6
      },
      textColor: {
        primary: "#000000",
        secondary: "#ffffff",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
