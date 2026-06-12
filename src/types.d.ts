import "@run-slicer/script";
import "./bsdiff-wasm";

declare global {
  var __SCRIPT_NAME__: string;
  var __SCRIPT_VERSION__: string;
  var __SCRIPT_DESCRIPTION__: string;

  export interface PatchEntry {
    location: string;
    originalHash: string;
    patchHash: string;
    outputHash: string;
    originalPath: string;
    patchPath: string;
    outputPath: string;
  }

  export interface DownloadContext {
    hash: string;
    url: string;
    fileName: string;
  }
}
