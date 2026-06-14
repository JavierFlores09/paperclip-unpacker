import type { Script, ScriptContext, Option } from "@run-slicer/script";
import { versionRadio, verifyCheckbox, runButton, manualRunButton, actionsGroup } from "./ui";
import { fetchVersions } from "./api";
import { loadTranslations, unloadTranslations } from "./i18n";
import { runUnpacker } from "./unpacker";

const script: Script = {
  name: __SCRIPT_NAME__,
  description: __SCRIPT_DESCRIPTION__,
  version: __SCRIPT_VERSION__,
  options: [versionRadio, verifyCheckbox, actionsGroup] as Option[],

  async load(context: ScriptContext) {
    loadTranslations(context);

    try {
      const versions = await fetchVersions();
      versionRadio.items = versions.map((v) => ({ id: v, label: v }));
      versionRadio.selected = versions[0];
    } catch (e: any) {
      console.error(`Failed to fetch Paper versions: ${e.message || e}`);
    }

    context.addEventListener("option_change", (e) => {
      if (e.option === runButton) {
        runUnpacker(context, false).catch((err) => console.error(err));
      }
      if (e.option === manualRunButton) {
        runUnpacker(context, true).catch((err) => console.error(err));
      }
    });
  },

  unload(context: ScriptContext) {
    unloadTranslations(context);
  },
};

export default script;
