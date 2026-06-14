import type { DownloadContext, PatchEntry } from "../types";
import type { BspatchModule } from "bsdiff-wasm";

export function parseDownloadContext(text: string): DownloadContext {
  const [hash, url, fileName] = text.trim().split("\t");
  return { hash, url, fileName };
}

export function parsePatchesList(text: string): PatchEntry[] {
  return text
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [
        location,
        originalHash,
        patchHash,
        outputHash,
        originalPath,
        patchPath,
        outputPath,
      ] = line.split("\t");
      return {
        location,
        originalHash,
        patchHash,
        outputHash,
        originalPath,
        patchPath,
        outputPath,
      };
    });
}

export function safeUnlink(fs: BspatchModule["FS"], path: string): void {
  try {
    fs.unlink(path);
  } catch {}
}
