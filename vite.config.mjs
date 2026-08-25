import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function deploymentMetadata() {
  const commit = String(process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || "local");
  const metadata = {
    commit,
    branch: String(process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH || "local"),
    apiOriginConfigured: Boolean(process.env.VITE_API_ORIGIN)
  };
  return {
    name: "deployment-metadata",
    transformIndexHtml: {
      order: "pre",
      handler() {
        return [{
          tag: "meta",
          attrs: { name: "voice-partition-commit", content: commit },
          injectTo: "head"
        }];
      }
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "deployment.json", source: `${JSON.stringify(metadata, null, 2)}\n` });
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [deploymentMetadata(), react({ jsxRuntime: "classic" })],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VOICE_PARTITION_API_ORIGIN || "http://127.0.0.1:7070",
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
      onwarn(warning, warn) {
        const isAstryxClientDirective = warning.code === "MODULE_LEVEL_DIRECTIVE"
          && warning.message?.includes('"use client"')
          && warning.id?.includes("node_modules/@astryxdesign/core/");
        if (isAstryxClientDirective) return;
        warn(warning);
      },
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
