import { unzip } from "fflate";
import { loadBspatch } from "bsdiff-wasm";
import type { Script, ScriptContext, Option } from "@run-slicer/script";

const runButton = {
  type: "button",
  id: "paperclip-unpacker/run",
  label: "Select Paper Jar & Unpack",
} as const;

const translations: Record<string, Record<string, string>> = {
  en: {
    "paperclip-unpacker/run.label": "Select Paper Jar & Unpack",
    "paperclip-unpacker/select-paper": "Select Paper jar",
    "paperclip-unpacker/downloading-vanilla": "Downloading vanilla jar: {0}...",
    "paperclip-unpacker/error-context":
      "Could not find META-INF/download-context in Paper jar.",
    "paperclip-unpacker/error-patches":
      "Could not find META-INF/patches.list in Paper jar.",
    "paperclip-unpacker/dl-failed": "Download failed: {0}",
    "paperclip-unpacker/fallback-pick-vanilla":
      "Download failed. Please select the matching vanilla jar manually.",
    "paperclip-unpacker/patches-found": "Patches to apply: {0}",
    "paperclip-unpacker/applying": "Applying patches...",
    "paperclip-unpacker/skip-original":
      "Skipping - missing original in vanilla jar: {0}",
    "paperclip-unpacker/skip-patch":
      "Skipping - missing patch in Paper jar: {0}",
    "paperclip-unpacker/patched": "[OK] {0}",
    "paperclip-unpacker/done": "Done! {0}/{1} patches applied.",
  },
};

function unzipBytes(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

function parseDownloadContext(text: string): DownloadContext {
  const [hash, url, fileName] = text.trim().split("\t");
  return { hash, url, fileName };
}

function parsePatchesList(text: string): PatchEntry[] {
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

async function pickFile(accept: string): Promise<Uint8Array> {
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

function safeUnlink(fs: any, path: string): void {
  try {
    fs.unlink(path);
  } catch {}
}

async function runUnpacker(context: ScriptContext): Promise<void> {
  const t = (key: string, ...args: string[]) => {
    let str = key;
    try {
      str = context.i18n.t(key);
      if (str === key) str = translations.en[key] || key;
    } catch {
      str = translations.en[key] || key;
    }
    return args.reduce((acc, arg, i) => acc.replace(`{${i}}`, arg), str);
  };

  const dec = new TextDecoder();

  try {
    console.log(t("paperclip-unpacker/select-paper"));
    const paperBytes = await pickFile(".jar");
    const paperZip = await unzipBytes(paperBytes);

    const downloadContextRaw = paperZip["META-INF/download-context"];
    if (!downloadContextRaw) {
      console.error(t("paperclip-unpacker/error-context"));
      return;
    }
    const downloadCtx = parseDownloadContext(dec.decode(downloadContextRaw));

    const patchesRaw = paperZip["META-INF/patches.list"];
    if (!patchesRaw) {
      console.error(t("paperclip-unpacker/error-patches"));
      return;
    }
    const patches = parsePatchesList(dec.decode(patchesRaw));
    console.log(
      t("paperclip-unpacker/patches-found", patches.length.toString())
    );

    let vanillaBytes: Uint8Array;

    try {
      console.log(t("paperclip-unpacker/downloading-vanilla", downloadCtx.url));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(downloadCtx.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      vanillaBytes = new Uint8Array(await res.arrayBuffer());
    } catch (err: any) {
      console.warn(
        t("paperclip-unpacker/dl-failed", err.message || "Unknown Error")
      );
      console.log(t("paperclip-unpacker/fallback-pick-vanilla"));

      vanillaBytes = await pickFile(".jar");
    }

    if (!vanillaBytes || vanillaBytes.length === 0) {
      console.error("Failed to obtain vanilla jar.");
      return;
    }

    const vanillaZip = await unzipBytes(vanillaBytes);

    console.log(t("paperclip-unpacker/applying"));
    const bspatch = await loadBspatch();
    let applied = 0;

    for (const patch of patches) {
      const originalKey = `META-INF/${patch.location}/${patch.originalPath}`;
      const patchKey = `META-INF/${patch.location}/${patch.patchPath}`;

      const originalBytes = vanillaZip[originalKey];
      const patchBytes = paperZip[patchKey];

      if (!originalBytes) {
        console.warn(t("paperclip-unpacker/skip-original", originalKey));
        continue;
      }
      if (!patchBytes) {
        console.warn(t("paperclip-unpacker/skip-patch", patchKey));
        continue;
      }

      const patchId = Math.random().toString(36).substring(2, 8);
      const oldFile = `o${patchId}`;
      const patchFile = `p${patchId}`;
      const newFile = `n${patchId}`;

      try {
        bspatch.FS.writeFile(oldFile, originalBytes);
        bspatch.FS.writeFile(patchFile, patchBytes);
        bspatch.callMain([oldFile, newFile, patchFile]);

        const patched = bspatch.FS.readFile(newFile);

        const workspaceName = `${patch.location}/${patch.outputPath}`;
        await context.workspace.add(workspaceName, patched);

        console.log(t("paperclip-unpacker/patched", workspaceName));
        applied++;
      } catch (e) {
        console.error(`Failed to apply patch ${patch.originalPath}:`, e);
      } finally {
        safeUnlink(bspatch.FS, oldFile);
        safeUnlink(bspatch.FS, patchFile);
        safeUnlink(bspatch.FS, newFile);
      }
    }

    console.log(
      t(
        "paperclip-unpacker/done",
        applied.toString(),
        patches.length.toString()
      )
    );
  } catch (err) {
    console.error("Unpacker failed:", err);
  }
}

const script: Script = {
  name: __SCRIPT_NAME__,
  description: __SCRIPT_DESCRIPTION__,
  version: __SCRIPT_VERSION__,
  options: [runButton],

  async load(context: ScriptContext) {
    for (const [locale, keys] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(keys)) {
        context.i18n.add(locale, key, value);
      }
    }

    context.addEventListener("option_change", (e) => {
      if (e.option === runButton) {
        runUnpacker(context).catch((err) => console.error(err));
      }
    });
  },

  unload(context: ScriptContext) {
    for (const [locale, keys] of Object.entries(translations)) {
      for (const key of Object.keys(keys)) {
        context.i18n.remove(locale, key);
      }
    }
  },
};

export default script;
