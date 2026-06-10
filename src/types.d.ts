declare var __SCRIPT_NAME__: string;
declare var __SCRIPT_VERSION__: string;
declare var __SCRIPT_DESCRIPTION__: string;

declare module "bsdiff-wasm" {
  export function loadBspatch(): Promise<BspatchModule>;
}

interface BspatchModule {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
  callMain(args: string[]): void;
}

interface PatchEntry {
  location: string;
  originalHash: string;
  patchHash: string;
  outputHash: string;
  originalPath: string;
  patchPath: string;
  outputPath: string;
}

interface DownloadContext {
  hash: string;
  url: string;
  fileName: string;
}
