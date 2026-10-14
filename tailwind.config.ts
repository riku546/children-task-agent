import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09090b", // シャープなZinc 950（テキストのメイン）
        moss: "#059669", // 洗練されたEmerald 600（アクセント・プライマリー）
        mint: "#ecfdf5", // Emerald 50
        coral: "#f43f5e", // Rose 500
        butter: "#f59e0b", // Amber 500
        cloud: "#f4f4f5", // Zinc 100
        sand: "#fafafa" // Zinc 50
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        xs: "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.07)",
        soft: "0 10px 30px -10px rgba(0, 0, 0, 0.08)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans JP"',
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
