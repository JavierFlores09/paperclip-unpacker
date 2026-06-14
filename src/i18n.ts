import type { ScriptContext } from "@run-slicer/script";
import en from "./locale/en.json";
import es from "./locale/es.json";

const translations = { en, es } as const;

export function loadTranslations(context: ScriptContext): void {
  for (const [locale, keys] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(keys)) {
      context.i18n.add(locale, key, value);
    }
  }
}

export function unloadTranslations(context: ScriptContext): void {
  for (const [locale, keys] of Object.entries(translations)) {
    for (const key of Object.keys(keys)) {
      context.i18n.remove(locale, key);
    }
  }
}
