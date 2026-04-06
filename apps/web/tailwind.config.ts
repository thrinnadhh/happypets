import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        heading: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#f0fffe",
          100: "#ccfffe",
          200: "#99fffd",
          300: "#5dfcf9",
          400: "#0df2f2",
          500: "#00d4d4",
          600: "#00a8a8",
          700: "#007f80",
          800: "#005f60",
          900: "#003f40",
        },
        ink:     "#0f1923",
        surface: "#f5fffe",
        muted:   "#6b7280",
        accent:  "#ff6b6b",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      borderRadius: {
        DEFAULT: "8px",
        sm:  "4px",
        md:  "8px",
        lg:  "12px",
        xl:  "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        soft:  "0 2px 8px rgba(0,212,212,0.10)",
        card:  "0 4px 24px rgba(0,0,0,0.08)",
        glow:  "0 8px 32px rgba(13,242,242,0.28)",
        "glow-sm": "0 4px 16px rgba(13,242,242,0.20)",
      },
      backgroundImage: {
        "brand-gradient":  "linear-gradient(135deg, #0df2f2 0%, #00a8a8 100%)",
        "brand-gradient-r": "linear-gradient(135deg, #00a8a8 0%, #0df2f2 100%)",
        "hero-gradient":   "linear-gradient(135deg, #0df2f2 0%, #00d4d4 50%, #007f80 100%)",
        "page-bg":         "linear-gradient(160deg, #f0fffe 0%, #ffffff 60%, #f5fffe 100%)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        pulseCyan: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(13,242,242,0.4)" },
          "50%":      { boxShadow: "0 0 0 10px rgba(13,242,242,0)" },
        },
      },
      animation: {
        shimmer:     "shimmer 2s linear infinite",
        float:       "float 3s ease-in-out infinite",
        "pulse-cyan":"pulseCyan 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
