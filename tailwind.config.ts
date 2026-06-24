import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        moss: "#5c7f61",
        mint: "#dcefe2",
        coral: "#dd7b6f",
        butter: "#f3d88b",
        cloud: "#f7f9f5"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 33, 29, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
