import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tauriBrowserProxy from "vite-plugin-tauri-in-the-browser";

export default defineConfig({
  plugins: [react(), tailwindcss(), tauriBrowserProxy()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
  },
});
