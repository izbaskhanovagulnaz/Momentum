import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#22213a",
          secondary: "#6f6d8a",
          muted: "#9b98b5",
        },
        line: {
          DEFAULT: "#e6e4f4",
          strong: "#d8d5ef",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#eef0fa",
        },
        accent: {
          DEFAULT: "#6f5cf6",
          soft: "#ece8ff",
        },
        success: {
          DEFAULT: "#22c58b",
          soft: "#e2f9ef",
        },
        danger: {
          DEFAULT: "#f4685f",
          soft: "#feeae8",
        },
        warning: {
          DEFAULT: "#f6a94f",
          soft: "#fff1de",
        },
        sky: {
          DEFAULT: "#3fb8e8",
          soft: "#e2f5fd",
        },
        peach: {
          DEFAULT: "#ff9466",
          soft: "#ffece2",
        },
        mint: {
          DEFAULT: "#34d3a3",
          soft: "#e2f9f1",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "1.75rem",
        "5xl": "2.25rem",
      },
      boxShadow: {
        neu: "var(--shadow-neu)",
        "neu-sm": "var(--shadow-neu-sm)",
        "neu-inset": "var(--shadow-neu-inset)",
        "neu-pressed": "var(--shadow-neu-pressed)",
      },
    },
  },
  plugins: [],
} satisfies Config;
