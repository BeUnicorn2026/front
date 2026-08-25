import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VOICE_PARTITION_API_ORIGIN || "http://127.0.0.1:3001",
        changeOrigin: false,
        ws: true
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) return "react-vendor";
          if (id.includes("node_modules/@astryxdesign/")) return "astryx";
          return "vendor";
        }
      }
    }
  }
}));
