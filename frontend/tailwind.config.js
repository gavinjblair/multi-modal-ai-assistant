/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#e0f2ff",
          100: "#b7e3ff",
          200: "#8ad3ff",
          300: "#5bc3ff",
          400: "#2bb3ff",
          500: "#1099e6",
          600: "#0a78b4",
          700: "#065782",
          800: "#023551",
          900: "#001521",
        },
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0,0,0,0.25)",
        glow: "0 10px 40px rgba(59,130,246,0.25)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(circle at 10% 20%, rgba(59,130,246,0.25), transparent 25%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.18), transparent 30%), radial-gradient(circle at 15% 80%, rgba(16,185,129,0.18), transparent 30%), linear-gradient(135deg, #0b1224 0%, #0f172a 50%, #0b1224 100%)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(59,130,246,0)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
