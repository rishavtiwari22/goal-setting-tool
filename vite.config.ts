import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Custom plugin to serve ONNX runtime files from node_modules
function serveOrtFiles() {
  return {
    name: "serve-ort-files",
    configureServer(server: any) {
      server.middlewares.use("/ort", (req: any, res: any, next: any) => {
        // Strip query parameters (e.g. ?import)
        const urlPath = req.url.split("?")[0];
        const filePath = path.join(
          __dirname,
          "node_modules/onnxruntime-web/dist",
          urlPath
        );

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
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), serveOrtFiles()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["onnxruntime-web"],
    },
    envPrefix: 'VITE_',
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      allowedHosts: ["stage-zoe.zuvy.org"],
      fs: {
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
  };
});