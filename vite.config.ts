import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Custom plugin to serve ONNX runtime files from public/ort or node_modules
function serveOrtFiles() {
  return {
    name: "serve-ort-files",
    configureServer(server: any) {
      server.middlewares.use("/ort", (req: any, res: any, next: any) => {
        // Strip query parameters (e.g. ?import)
        const urlPath = req.url.split("?")[0];

        // First try public/ort (preferred - same as production)
        let filePath = path.join(__dirname, "public/ort", urlPath);

        // Fall back to node_modules if not found
        if (!fs.existsSync(filePath)) {
          filePath = path.join(__dirname, "node_modules/onnxruntime-web/dist", urlPath);
        }

        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath);
          const contentType = ext === ".mjs" || ext === ".js"
            ? "application/javascript"
            : ext === ".wasm"
              ? "application/wasm"
              : "application/octet-stream";

          res.setHeader("Content-Type", contentType);
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          fs.createReadStream(filePath).pipe(res);
        } else {
          console.log(`[serveOrtFiles] File not found: ${filePath}`);
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveOrtFiles()],
  optimizeDeps: {
    exclude: ["onnxruntime-web", "@mintplex-labs/piper-tts-web"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      // Allow serving files from node_modules
      allow: [".."],
    },
    proxy: {
      "/api/deepseek": {
        target: "https://api.deepseek.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ""),
      },
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
});