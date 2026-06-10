import { readFile } from "node:fs/promises";
import { defineConfig } from "rolldown";

const pkg = JSON.parse(await readFile("./package.json", "utf8"));
const { name, version, description, dependencies } = pkg;

const externalDeps = Object.keys(dependencies || {}).filter(
  (dep) => dep !== "@run-slicer/script"
);

const paths: Record<string, string> = {};
for (const dep of externalDeps) {
  const depPkg = JSON.parse(
    await readFile(`./node_modules/${dep}/package.json`, "utf8")
  );
  let entry = depPkg.module || depPkg.main || "index.js";
  if (depPkg.exports && depPkg.exports["."]) {
    const exp = depPkg.exports["."];
    entry = exp.import?.default || exp.import || exp.default || entry;
  }
  entry = entry.replace(/^\.\//, "");
  paths[dep] = `https://cdn.jsdelivr.net/npm/${dep}@${depPkg.version}/${entry}/+esm`;
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
  tsconfig: "./tsconfig.json",
});
