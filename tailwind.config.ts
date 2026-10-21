import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--color-cream) / <alpha-value>)",
        forest: "rgb(var(--color-forest) / <alpha-value>)",
        "forest-light": "rgb(var(--color-forest-light) / <alpha-value>)",
        green: "rgb(var(--color-green) / <alpha-value>)",
        peach: "rgb(var(--color-peach) / <alpha-value>)",
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        // Dark mode surfaces (kept within brand family)
        "cream-dark": "#15201C",
        "surface-dark": "#1C2B25",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(25, 59, 50, 0.06), 0 1px 1px rgba(25, 59, 50, 0.04)",
        soft: "0 4px 16px rgba(25, 59, 50, 0.08)",
      },
      maxWidth: {
        content: "1180px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        cardIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        nowPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.75)" },
        },
        checkPop: {
          "0%": { transform: "scale(0.7)" },
          "60%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-out both",
        slideIn: "slideIn 0.35s ease-out both",
        pop: "pop 0.14s ease-out both",
        cardIn: "cardIn 0.28s ease-out both",
        nowPulse: "nowPulse 2.2s ease-in-out infinite",
        checkPop: "checkPop 0.22s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
