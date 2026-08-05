import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#111113",
          secondary: "#6b6b70",
          muted: "#a1a1aa",
        },
        line: {
          DEFAULT: "#ececec",
          strong: "#e0e0e0",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#fafafa",
        },
        accent: {
          DEFAULT: "#3b66f5",
          soft: "#eef2ff",
        },
        success: {
          DEFAULT: "#1db981",
          soft: "#e7f9f1",
        },
        danger: {
          DEFAULT: "#ef4444",
          soft: "#fef1f1",
        },
        warning: {
          DEFAULT: "#f5a524",
          soft: "#fff6e6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
