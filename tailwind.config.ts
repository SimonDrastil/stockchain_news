import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 12px 30px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        glass: "22px",
      },
      colors: {
        "glass-white": "rgba(255,255,255,0.08)",
        "glass-black": "rgba(0,0,0,0.35)",
        "glass-border": "rgba(255,255,255,0.12)",
      },
      backdropBlur: {
        glass: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
