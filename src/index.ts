import { unzip } from "fflate";
import { loadBspatch } from "bsdiff-wasm";
import type {
  Script,
  ScriptContext,
  Option,
  EventMap,
} from "@run-slicer/script";

const runButton = {
  type: "button",
  id: "paperclip-unpacker/run",
  label: "Unpack Paper Jar",
} as const;

const translations: Record<string, Record<string, string>> = {
  en: {
    "paperclip-unpacker/run.label": "Unpack Paper Jar",
    "paperclip-unpacker/select-paper": "Select Paper jar",
    "paperclip-unpacker/select-vanilla": "Select Vanilla jar (Expected: {0})",
    "paperclip-unpacker/patches-found": "Patches to apply: {0}",
    "paperclip-unpacker/applying": "Applying patches...",
    "paperclip-unpacker/patched": "Patched: {0}",
    "paperclip-unpacker/skip-original":
      "Skipping - missing original in vanilla jar: {0}",
    "paperclip-unpacker/skip-patch":
      "Skipping - missing patch in Paper jar: {0}",
    "paperclip-unpacker/done": "Done! {0}/{1} patches applied.",
    "paperclip-unpacker/error-context":
      "Could not find META-INF/download-context in Paper jar.",
    "paperclip-unpacker/error-patches":
      "Could not find META-INF/patches.list in Paper jar.",
    "paperclip-unpacker/no-file": "No file selected.",
  },
};

function unzipBytes(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

async function pickFile(accept: string): Promise<Uint8Array> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;

  const file = await new Promise<File | undefined>((resolve) => {
    input.onchange = () => resolve(input.files?.[0]);
    input.click();
  });

  if (!file) throw new Error("No file selected");
  return new Uint8Array(await file.arrayBuffer());
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

function createTranslator(context: ScriptContext) {
  return (key: string, ...args: string[]) => {
    let str = key;
    try {
      str = context.i18n.t(key);
      if (str === key) {
        str = translations.en[key] || key;
      }
    } catch {
      str = translations.en[key] || key;
    }
    return args.reduce((acc, arg, i) => acc.replace(`{${i}}`, arg), str);
  };
}

async function runUnpacker(context: ScriptContext) {
  const t = createTranslator(context);
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

    console.log(t("paperclip-unpacker/select-vanilla", downloadCtx.fileName));
    const vanillaBytes = await pickFile(".jar");
    const vanillaZip = await unzipBytes(vanillaBytes);

    console.log(t("paperclip-unpacker/applying"));
    const bspatch = await loadBspatch();
    let applied = 0;

    for (const patch of patches) {
      const originalKey = `META-INF/${patch.location}/${patch.originalPath}`;
      const patchKey = `META-INF/${patch.location}/${patch.patchPath}`;

      let originalBytes =
        vanillaZip[originalKey] ||
        vanillaZip[`${patch.location}/${patch.originalPath}`];

      if (!originalBytes && patch.originalPath === downloadCtx.fileName) {
        originalBytes = vanillaBytes;
      }

      const patchBytes = paperZip[patchKey];

      if (!originalBytes) {
        console.warn(t("paperclip-unpacker/skip-original", originalKey));
        continue;
      }
      if (!patchBytes) {
        console.warn(t("paperclip-unpacker/skip-patch", patchKey));
        continue;
      }

      try {
        bspatch.FS.writeFile("old.bin", originalBytes);
        bspatch.FS.writeFile("patch.bin", patchBytes);
        bspatch.callMain(["old.bin", "new.bin", "patch.bin"]);

        const patched = bspatch.FS.readFile("new.bin");

        bspatch.FS.unlink("old.bin");
        bspatch.FS.unlink("patch.bin");
        bspatch.FS.unlink("new.bin");

        const workspaceName = `${patch.location}/${patch.outputPath}`;
        await context.workspace.add(workspaceName, patched);

        console.log(t("paperclip-unpacker/patched", workspaceName));
        applied++;
      } catch (e) {
        console.error(`Failed to apply patch ${patch.originalPath}:`, e);
        try {
          bspatch.FS.unlink("old.bin");
        } catch {}
        try {
          bspatch.FS.unlink("patch.bin");
        } catch {}
        try {
          bspatch.FS.unlink("new.bin");
        } catch {}
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
