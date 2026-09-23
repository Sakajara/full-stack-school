import type { Config } from "tailwindcss";

// Every colour the interface uses comes from CSS variables defined in
// globals.css, so light and dark themes switch in one place. The grey and
// slate scales are remapped too: in the dark theme "gray-500" text is still
// the secondary text colour, just lighter.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, v(`${prefix}-${n}`)])
  );

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        ink: v("ink"),
        gray: scale("gray"),
        slate: scale("gray"),
        lamaSky: v("lama-sky"),
        lamaSkyLight: v("lama-sky-light"),
        lamaPurple: v("lama-purple"),
        lamaPurpleLight: v("lama-purple-light"),
        lamaYellow: v("lama-yellow"),
        lamaYellowLight: v("lama-yellow-light"),
      },
    },
  },
  plugins: [],
};
export default config;
