import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" - сайт открывается из любой подпапки (GitHub Pages, Vercel, локально)
export default defineConfig({
  plugins: [react()],
  base: "./",
});
