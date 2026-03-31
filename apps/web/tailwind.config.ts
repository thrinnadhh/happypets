import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ['"Bodoni Moda"', '"Iowan Old Style"', "Georgia", "serif"],
      },
      colors: {
        brand: {
          50: "#FBF6ED",
          100: "#F4E5BE",
          300: "#E7C773",
          400: "#D4AF37",
          500: "#C79A22",
          700: "#85631B",
        },
        ink: "#1A1A1A",
        mist: "#FAFAF9",
        navy: "#2F4F6F",
        sand: "#F5EFE6",
        parchment: "#EDE3D3",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(78, 58, 31, 0.08)",
        card: "0 28px 80px rgba(78, 58, 31, 0.12)",
        glow: "0 16px 38px rgba(47, 79, 111, 0.26)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2F4F6F 0%, #3B628A 100%)",
        "soft-grid":
          "radial-gradient(circle at top left, rgba(212,175,55,0.16) 0, transparent 24%), radial-gradient(circle at 85% 10%, rgba(47,79,111,0.08) 0, transparent 28%), linear-gradient(180deg, #F5EFE6 0%, #EDE3D3 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulseSoft 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
