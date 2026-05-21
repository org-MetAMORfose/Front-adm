import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        mist: "#f6f7f4",
        sage: "#6f8f7a",
        coral: "#d96f54"
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(23, 33, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
