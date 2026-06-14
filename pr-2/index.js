import { loadBspatch } from "https://unpkg.com/bsdiff-wasm";
import { unzip } from "https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js";
//#region src/ui.ts
const versionRadio = {
	type: "radio",
	id: "paperclip-unpacker/version",
	label: "paperclip-unpacker/version.label",
	items: [],
	selected: ""
};
const verifyCheckbox = {
	type: "checkbox",
	id: "paperclip-unpacker/verify",
	label: "paperclip-unpacker/verify.label",
	checked: true
};
const runButton = {
	type: "button",
	id: "paperclip-unpacker/run",
	label: "paperclip-unpacker/run.label"
};
const manualRunButton = {
	type: "button",
	id: "paperclip-unpacker/run-manual",
	label: "paperclip-unpacker/run-manual.label"
};
const actionsGroup = {
	type: "group",
	id: "paperclip-unpacker/actions",
	label: "paperclip-unpacker/actions.label",
	options: [runButton, manualRunButton]
};
//#endregion
//#region src/api.ts
const FILL_API = "https://fill.papermc.io/v3/projects/paper";
async function fetchVersions() {
	const res = await fetch(FILL_API);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	return Object.values(data.versions).flat();
}
async function fetchLatestBuild(version) {
	const res = await fetch(`${FILL_API}/versions/${version}/builds/latest`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.json();
}
//#endregion
//#region src/i18n.ts
const translations = {
	en: {
		"paperclip-unpacker/version.label": "Minecraft version",
		"paperclip-unpacker/verify.label": "Verify hashes",
		"paperclip-unpacker/actions.label": "Actions",
		"paperclip-unpacker/run.label": "Download and unpack",
		"paperclip-unpacker/run-manual.label": "Select Paper jar manually",
		"paperclip-unpacker/no-version": "No version selected!",
		"paperclip-unpacker/fetching-build": "Fetching latest build for {0}...",
		"paperclip-unpacker/no-download": "No application download found in build response!",
		"paperclip-unpacker/downloading-paper": "Downloading Paper {0} build #{1}...",
		"paperclip-unpacker/select-paper": "Select Paper jar",
		"paperclip-unpacker/download-failed-manual": "Automatic download failed, please select the Paper jar manually.",
		"paperclip-unpacker/hash-mismatch-paper": "Paper jar hash mismatch! Expected {0}, got {1}",
		"paperclip-unpacker/paper-verified": "Paper jar verified.",
		"paperclip-unpacker/downloading-vanilla": "Downloading vanilla jar: {0}",
		"paperclip-unpacker/verifying-vanilla": "Verifying vanilla jar hash...",
		"paperclip-unpacker/vanilla-verified": "Vanilla jar verified.",
		"paperclip-unpacker/hash-mismatch-vanilla": "Vanilla jar hash mismatch! Expected {0}, got {1}",
		"paperclip-unpacker/patches-found": "Patches to apply: {0}",
		"paperclip-unpacker/init-bspatch": "Initializing bspatch...",
		"paperclip-unpacker/applying": "Applying patches...",
		"paperclip-unpacker/skip-original": "Skipping - missing original in vanilla jar: {0}",
		"paperclip-unpacker/skip-patch": "Skipping - missing patch in Paper jar: {0}",
		"paperclip-unpacker/hash-mismatch-original": "Original hash mismatch, skipping: {0}",
		"paperclip-unpacker/hash-mismatch-patch": "Patch hash mismatch, skipping: {0}",
		"paperclip-unpacker/hash-mismatch-output": "Output hash mismatch after patching: {0}",
		"paperclip-unpacker/patched": "[OK] {0}",
		"paperclip-unpacker/done": "Done! {0}/{1} patches applied.",
		"paperclip-unpacker/fallback-pick-vanilla": "Download failed. Please select the matching vanilla jar manually.",
		"paperclip-unpacker/error-context": "Could not find META-INF/download-context in Paper jar.",
		"paperclip-unpacker/error-patches": "Could not find META-INF/patches.list in Paper jar.",
		"paperclip-unpacker/error-vanilla-empty": "Failed to get vanilla jar.",
		"paperclip-unpacker/error-generic": "Unpacker failed: {0}"
	},
	es: {
		"paperclip-unpacker/version.label": "Versión de Minecraft",
		"paperclip-unpacker/verify.label": "Verific hash",
		"paperclip-unpacker/actions.label": "Acciones",
		"paperclip-unpacker/run.label": "Descargar y desempaquetar",
		"paperclip-unpacker/run-manual.label": "Seleccionar archivo Paper manualmente",
		"paperclip-unpacker/no-version": "¡No se ha seleccionado ninguna versión!",
		"paperclip-unpacker/fetching-build": "Obteniendo la última compilación de {0}...",
		"paperclip-unpacker/no-download": "¡No se encontró la descarga de la aplicación en la respuesta de la compilación!",
		"paperclip-unpacker/downloading-paper": "Descargando Paper {0} compilación #{1}...",
		"paperclip-unpacker/select-paper": "Seleccionar archivo Paper (.jar)",
		"paperclip-unpacker/download-failed-manual": "La descarga automática falló, por favor selecciona el archivo Paper manualmente.",
		"paperclip-unpacker/hash-mismatch-paper": "¡Firma del archivo Paper incorrecta! Esperada {0}, obtenida {1}",
		"paperclip-unpacker/paper-verified": "Archivo Paper verificado con éxito.",
		"paperclip-unpacker/downloading-vanilla": "Descargando archivo vanilla: {0}",
		"paperclip-unpacker/verifying-vanilla": "Verificando firma del archivo vanilla...",
		"paperclip-unpacker/vanilla-verified": "Archivo vanilla verificado con éxito.",
		"paperclip-unpacker/hash-mismatch-vanilla": "¡Firma del archivo vanilla incorrecta! Esperada {0}, obtenida {1}",
		"paperclip-unpacker/patches-found": "Parches a aplicar: {0}",
		"paperclip-unpacker/init-bspatch": "Inicializando bspatch...",
		"paperclip-unpacker/applying": "Aplicando parches...",
		"paperclip-unpacker/skip-original": "Omitiendo - falta el original en el archivo vanilla: {0}",
		"paperclip-unpacker/skip-patch": "Omitiendo - falta el parche en el archivo Paper: {0}",
		"paperclip-unpacker/hash-mismatch-original": "Firma del original incorrecta, omitiendo: {0}",
		"paperclip-unpacker/hash-mismatch-patch": "Firma del parche incorrecta, omitiendo: {0}",
		"paperclip-unpacker/hash-mismatch-output": "Firma del resultado incorrecta tras parchar: {0}",
		"paperclip-unpacker/patched": "[OK] {0}",
		"paperclip-unpacker/done": "¡Listo! {0}/{1} parches aplicados.",
		"paperclip-unpacker/fallback-pick-vanilla": "Descarga fallida. Por favor selecciona el archivo vanilla correspondiente manualmente.",
		"paperclip-unpacker/error-context": "No se pudo encontrar META-INF/download-context en el archivo Paper.",
		"paperclip-unpacker/error-patches": "No se pudo encontrar META-INF/patches.list en el archivo Paper.",
		"paperclip-unpacker/error-vanilla-empty": "No se pudo obtener el archivo vanilla.",
		"paperclip-unpacker/error-generic": "El desempaquetador falló: {0}"
	}
};
function loadTranslations(context) {
	for (const [locale, keys] of Object.entries(translations)) for (const [key, value] of Object.entries(keys)) context.i18n.add(locale, key, value);
}
function unloadTranslations(context) {
	for (const [locale, keys] of Object.entries(translations)) for (const key of Object.keys(keys)) context.i18n.remove(locale, key);
}
//#endregion
//#region src/utils/archive.ts
function unzipBytes(bytes) {
	return new Promise((resolve, reject) => {
		unzip(bytes, (err, files) => err ? reject(err) : resolve(files));
	});
}
//#endregion
//#region src/utils/crypto.ts
async function sha256hex(bytes) {
	const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	const hash = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
//#endregion
//#region src/utils/file.ts
function pickFile(accept) {
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
			const file = e.target.files?.[0];
			if (!file) {
				reject(/* @__PURE__ */ new Error("No file selected"));
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
//#endregion
//#region src/utils/patcher.ts
function parseDownloadContext(text) {
	const [hash, url, fileName] = text.trim().split("	");
	return {
		hash,
		url,
		fileName
	};
}
function parsePatchesList(text) {
	return text.split("\n").filter((line) => line.trim() && !line.startsWith("#")).map((line) => {
		const [location, originalHash, patchHash, outputHash, originalPath, patchPath, outputPath] = line.split("	");
		return {
			location,
			originalHash,
			patchHash,
			outputHash,
			originalPath,
			patchPath,
			outputPath
		};
	});
}
function safeUnlink(fs, path) {
	try {
		fs.unlink(path);
	} catch {}
}
//#endregion
//#region src/unpacker.ts
async function runUnpacker(context, isManual) {
	const t = (key, ...args) => {
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
	let toastId;
	try {
		let paperBytes;
		if (isManual) {
			console.log(t("paperclip-unpacker/select-paper"));
			toastId = context.notification.loading("paperclip-unpacker/select-paper");
			paperBytes = await pickFile(".jar");
		} else {
			console.log(t("paperclip-unpacker/fetching-build", version));
			toastId = context.notification.loading("paperclip-unpacker/fetching-build", { msgArgs: [version] });
			const build = await fetchLatestBuild(version);
			const appDownload = build.downloads?.["server:default"];
			if (!appDownload) {
				console.error(t("paperclip-unpacker/no-download"));
				context.notification.error("paperclip-unpacker/no-download", { id: toastId });
				return;
			}
			try {
				console.log(t("paperclip-unpacker/downloading-paper", version, build.id.toString()));
				context.notification.loading("paperclip-unpacker/downloading-paper", {
					id: toastId,
					msgArgs: [version, build.id.toString()]
				});
				const paperRes = await fetch(appDownload.url, { headers: { "User-Agent": "paperclip-unpacker-slicer/1.0.0" } });
				if (!paperRes.ok) throw new Error(`HTTP ${paperRes.status}`);
				paperBytes = new Uint8Array(await paperRes.arrayBuffer());
			} catch (err) {
				console.warn(t("paperclip-unpacker/download-failed-manual"));
				context.notification.warning("paperclip-unpacker/download-failed-manual", { id: toastId });
				console.warn(err);
				context.notification.loading("paperclip-unpacker/select-paper", { id: toastId });
				paperBytes = await pickFile(".jar");
			}
			if (shouldVerify) {
				const paperHash = await sha256hex(paperBytes);
				if (paperHash !== appDownload.checksums.sha256) {
					const msg = t("paperclip-unpacker/hash-mismatch-paper", appDownload.checksums.sha256, paperHash);
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
		context.notification.info("paperclip-unpacker/patches-found", { msgArgs: [patches.length.toString()] });
		console.log(t("paperclip-unpacker/downloading-vanilla", downloadCtx.url));
		context.notification.loading("paperclip-unpacker/downloading-vanilla", {
			id: toastId,
			msgArgs: [downloadCtx.url]
		});
		let vanillaBytes;
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 3e4);
			const vanillaRes = await fetch(downloadCtx.url, { signal: controller.signal });
			clearTimeout(timeout);
			if (!vanillaRes.ok) throw new Error(`HTTP ${vanillaRes.status}`);
			vanillaBytes = new Uint8Array(await vanillaRes.arrayBuffer());
		} catch (err) {
			if (err.name === "AbortError") console.error("Vanilla download timed out");
			else console.error("Failed to download vanilla jar:", err);
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
				const msg = t("paperclip-unpacker/hash-mismatch-vanilla", downloadCtx.hash, vanillaHash);
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
				if (await sha256hex(originalBytes) !== patch.originalHash) {
					console.error(t("paperclip-unpacker/hash-mismatch-original", patch.originalPath));
					continue;
				}
				if (await sha256hex(patchBytes) !== patch.patchHash) {
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
				bspatch.callMain([
					oldFile,
					newFile,
					patchFile
				]);
				const patched = bspatch.FS.readFile(newFile);
				if (shouldVerify && !isManual && await sha256hex(patched) !== patch.outputHash) {
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
		console.log(t("paperclip-unpacker/done", applied.toString(), patches.length.toString()));
		context.notification.success("paperclip-unpacker/done", {
			id: toastId,
			msgArgs: [applied.toString(), patches.length.toString()]
		});
	} catch (err) {
		console.error("Unpacker failed:", err);
		context.notification.error("paperclip-unpacker/error-generic", {
			id: toastId,
			msgArgs: [err.message || err]
		});
	}
}
//#endregion
//#region src/index.ts
const script = {
	name: "paperclip-unpacker",
	description: "Slicer.run script to unpack paperclip in-browser.",
	version: "1.1.0",
	options: [
		versionRadio,
		verifyCheckbox,
		actionsGroup
	],
	async load(context) {
		loadTranslations(context);
		try {
			const versions = await fetchVersions();
			versionRadio.items = versions.map((v) => ({
				id: v,
				label: v
			}));
			versionRadio.selected = versions[0];
		} catch (e) {
			console.error(`Failed to fetch Paper versions: ${e.message || e}`);
		}
		context.addEventListener("option_change", (e) => {
			if (e.option === runButton) runUnpacker(context, false).catch((err) => console.error(err));
			if (e.option === manualRunButton) runUnpacker(context, true).catch((err) => console.error(err));
		});
	},
	unload(context) {
		unloadTranslations(context);
	}
};
//#endregion
export { script as default };
