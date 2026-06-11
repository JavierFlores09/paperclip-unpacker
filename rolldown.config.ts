import { readFile } from "node:fs/promises";
import { defineConfig } from "rolldown";

const pkg = JSON.parse(await readFile("./package.json", "utf8"));
const { name, version, description } = pkg;

const externalDeps = ["fflate", "bsdiff-wasm"];

const paths = {
  fflate: "https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js",
  "bsdiff-wasm": "https://unpkg.com/bsdiff-wasm",
};

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
  tsconfig: "./tsconfig.json",
});
