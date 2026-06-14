export function pickFile(accept: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    const cleanup = () => {
      input.onchange = null;
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.onchange = async (e) => {
      cleanup();
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      try {
        resolve(new Uint8Array(await file.arrayBuffer()));
      } catch (err) {
        reject(err);
      }
    };

    document.body.appendChild(input);
    input.click();
  });
}
