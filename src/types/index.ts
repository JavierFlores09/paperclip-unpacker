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
