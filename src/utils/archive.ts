import { unzip } from "fflate";

export function unzipBytes(
  bytes: Uint8Array
): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (err, files) => (err ? reject(err) : resolve(files)));
  });
}
