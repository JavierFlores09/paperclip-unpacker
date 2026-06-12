declare module "bsdiff-wasm" {
  export function loadBspatch(): Promise<BspatchModule>;
  export interface BspatchModule {
    FS: {
      writeFile(path: string, data: Uint8Array<ArrayBufferLike>): void;
      readFile(path: string): Uint8Array<ArrayBuffer>;
      unlink(path: string): void;
    };
    callMain(args: string[]): void;
  }
}
