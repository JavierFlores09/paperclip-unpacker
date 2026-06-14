import { loadBspatch } from "bsdiff-wasm";
import type { ScriptContext } from "@run-slicer/script";
import { versionRadio, verifyCheckbox } from "./ui";
import { fetchLatestBuild } from "./api";
import { unzipBytes } from "./utils/archive";
import { sha256hex } from "./utils/crypto";
import { pickFile } from "./utils/file";
import { parseDownloadContext, parsePatchesList, safeUnlink } from "./utils/patcher";

export async function runUnpacker(
  context: ScriptContext,
  isManual: boolean
): Promise<void> {
  const t = (key: string, ...args: string[]) => {
    let str = context.i18n.t(key);
    return args.reduce((acc, arg, i) => acc.replace(`{${i}}`, arg), str);
  };

  const version = versionRadio.selected;
  if (!version) {
    console.error(t("paperclip-unpacker/no-version"));
    context.notification.error("paperclip-unpacker/no-version");
    return;
  }

  const shouldVerify = verifyCheckbox.checked;
  const dec = new TextDecoder();
  let toastId: string | number | undefined;

  try {
    let paperBytes: Uint8Array;

    if (isManual) {
      console.log(t("paperclip-unpacker/select-paper"));
      toastId = context.notification.loading("paperclip-unpacker/select-paper");
      paperBytes = await pickFile(".jar");
    } else {
      console.log(t("paperclip-unpacker/fetching-build", version));
      toastId = context.notification.loading("paperclip-unpacker/fetching-build", {
        msgArgs: [version],
      });
      const build = await fetchLatestBuild(version);

      const appDownload = build.downloads?.["server:default"];
      if (!appDownload) {
        console.error(t("paperclip-unpacker/no-download"));
        context.notification.error("paperclip-unpacker/no-download", { id: toastId });
        return;
      }

      try {
        console.log(
          t(
            "paperclip-unpacker/downloading-paper",
            version,
            build.id.toString()
          )
        );
        context.notification.loading("paperclip-unpacker/downloading-paper", {
          id: toastId,
          msgArgs: [version, build.id.toString()],
        });

        const paperRes = await fetch(appDownload.url, {
          headers: { "User-Agent": "paperclip-unpacker-slicer/1.0.0" },
        });

        if (!paperRes.ok) throw new Error(`HTTP ${paperRes.status}`);

        paperBytes = new Uint8Array(await paperRes.arrayBuffer());
      } catch (err: any) {
        console.warn(t("paperclip-unpacker/download-failed-manual"));
        context.notification.warning("paperclip-unpacker/download-failed-manual", { id: toastId });
        console.warn(err);
        context.notification.loading("paperclip-unpacker/select-paper", { id: toastId });
        paperBytes = await pickFile(".jar");
      }

      if (shouldVerify) {
        const paperHash = await sha256hex(paperBytes);
        if (paperHash !== appDownload.checksums.sha256) {
          const msg = t(
            "paperclip-unpacker/hash-mismatch-paper",
            appDownload.checksums.sha256,
            paperHash
          );
          console.error(msg);
          context.notification.error(msg, { id: toastId });
          return;
        }
        console.log(t("paperclip-unpacker/paper-verified"));
      }
    }

    const paperZip = await unzipBytes(paperBytes);

    const downloadContextRaw = paperZip["META-INF/download-context"];
    if (!downloadContextRaw) {
      context.notification.error("paperclip-unpacker/error-context", { id: toastId });
      return;
    }

    const downloadCtx = parseDownloadContext(dec.decode(downloadContextRaw));

    const patchesRaw = paperZip["META-INF/patches.list"];
    if (!patchesRaw) {
      context.notification.error("paperclip-unpacker/error-patches", { id: toastId });
      return;
    }

    const patches = parsePatchesList(dec.decode(patchesRaw));
    console.log(t("paperclip-unpacker/patches-found", patches.length.toString()));
    context.notification.info("paperclip-unpacker/patches-found", {
      msgArgs: [patches.length.toString()],
    });

    console.log(t("paperclip-unpacker/downloading-vanilla", downloadCtx.url));
    context.notification.loading("paperclip-unpacker/downloading-vanilla", {
      id: toastId,
      msgArgs: [downloadCtx.url],
    });

    let vanillaBytes: Uint8Array;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const vanillaRes = await fetch(downloadCtx.url, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!vanillaRes.ok) throw new Error(`HTTP ${vanillaRes.status}`);

      vanillaBytes = new Uint8Array(await vanillaRes.arrayBuffer());
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("Vanilla download timed out");
      } else {
        console.error("Failed to download vanilla jar:", err);
      }

      context.notification.warning("paperclip-unpacker/fallback-pick-vanilla", { id: toastId });
      context.notification.loading("paperclip-unpacker/select-paper", { id: toastId });
      vanillaBytes = await pickFile(".jar");
    }

    if (!vanillaBytes || vanillaBytes.length === 0) {
      context.notification.error("paperclip-unpacker/error-vanilla-empty", { id: toastId });
      return;
    }

    if (shouldVerify) {
      console.log(t("paperclip-unpacker/verifying-vanilla"));
      const vanillaHash = await sha256hex(vanillaBytes);
      if (vanillaHash !== downloadCtx.hash) {
        const msg = t(
          "paperclip-unpacker/hash-mismatch-vanilla",
          downloadCtx.hash,
          vanillaHash
        );
        console.error(msg);
        context.notification.error(msg, { id: toastId });
        return;
      }
      console.log(t("paperclip-unpacker/vanilla-verified"));
    }

    const vanillaZip = await unzipBytes(vanillaBytes);

    console.log(t("paperclip-unpacker/init-bspatch"));
    context.notification.loading("paperclip-unpacker/applying", { id: toastId });
    const bspatch = await loadBspatch();

    console.log(t("paperclip-unpacker/applying"));
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

      if (shouldVerify && !isManual) {
        if ((await sha256hex(originalBytes)) !== patch.originalHash) {
          console.error(t("paperclip-unpacker/hash-mismatch-original", patch.originalPath));
          continue;
        }
        if ((await sha256hex(patchBytes)) !== patch.patchHash) {
          console.error(t("paperclip-unpacker/hash-mismatch-patch", patch.patchPath));
          continue;
        }
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

        if (shouldVerify && !isManual && (await sha256hex(patched)) !== patch.outputHash) {
          console.error(t("paperclip-unpacker/hash-mismatch-output", patch.outputPath));
          continue;
        }

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
      t("paperclip-unpacker/done", applied.toString(), patches.length.toString())
    );
    context.notification.success("paperclip-unpacker/done", {
      id: toastId,
      msgArgs: [applied.toString(), patches.length.toString()],
    });
  } catch (err: any) {
    console.error("Unpacker failed:", err);
    context.notification.error("paperclip-unpacker/error-generic", {
      id: toastId,
      msgArgs: [err.message || err],
    });
  }
}
