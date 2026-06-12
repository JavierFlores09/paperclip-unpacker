import { readFile } from "node:fs/promises";
import { defineConfig } from "rolldown";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(await readFile("./package.json", "utf8"));
const { name, version, description } = pkg;

const externalDeps = ["fflate", "bsdiff-wasm"];

const paths = {
  fflate: "https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js",
  "bsdiff-wasm": "https://unpkg.com/bsdiff-wasm",
};

const isWatch = process.argv.includes("--watch") || process.argv.includes("-w");

function devServerPlugin() {
  let serverStarted = false;
  const PORT = 5000;
  const DIST_DIR = path.resolve("./dist");

  return {
    name: "dev-server",
    writeBundle() {
      if (!serverStarted) {
        serverStarted = true;
        const server = http.createServer((req, res) => {
          // Add CORS headers
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "*");

          // Disable caching completely
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");

          if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
          }

          const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
          const pathname = parsedUrl.pathname;
          const filePath = path.join(DIST_DIR, pathname === "/" ? "index.js" : pathname);

          if (!filePath.startsWith(DIST_DIR)) {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("Forbidden");
            return;
          }

          fs.readFile(filePath, (err, data) => {
            if (err) {
              if (err.code === "ENOENT") {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("File not found");
              } else {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end(`Server error: ${err.code}`);
              }
              return;
            }

            let contentType = "application/javascript";
            if (filePath.endsWith(".json")) {
              contentType = "application/json";
            } else if (filePath.endsWith(".css")) {
              contentType = "text/css";
            } else if (filePath.endsWith(".html")) {
              contentType = "text/html";
            }

            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
          });
        });

        server.listen(PORT, () => {
          console.log(`\n\x1b[32m[Dev Server] Serving dist/ at http://localhost:${PORT}/\x1b[0m`);
          console.log(`\x1b[32m[Dev Server] CORS enabled, Cache-Control disabled\x1b[0m`);
        });
      }

      // Re-print the Slicer integration link on every rebuild (after console clears)
      setTimeout(() => {
        console.log("");
        console.log(`\x1b[35m[Dev Server] Click here to open in local Slicer and load the script:\x1b[0m`);
        console.log(`\x1b[36mhttp://localhost:5173/?script=http://localhost:${PORT}/index.js\x1b[0m`);
        console.log("");
      }, 100);
    },
  };
}

export default defineConfig({
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
    entryFileNames: "[name].js",
    chunkFileNames: "[name]-[hash].js",
    paths,
  },
  transform: {
    define: {
      __SCRIPT_NAME__: JSON.stringify(name),
      __SCRIPT_VERSION__: JSON.stringify(version),
      __SCRIPT_DESCRIPTION__: JSON.stringify(description),
    },
  },
  external: [...externalDeps, /^https?:\/\//],
  plugins: isWatch ? [devServerPlugin()] : [],
  tsconfig: "./tsconfig.json",
});
