import type { Option, CheckboxOption, ButtonOption } from "@run-slicer/script";

export const versionRadio = {
  type: "radio" as const,
  id: "paperclip-unpacker/version",
  label: "paperclip-unpacker/version.label",
  items: [] as { id: string; label: string }[],
  selected: "",
};

export const verifyCheckbox: CheckboxOption = {
  type: "checkbox",
  id: "paperclip-unpacker/verify",
  label: "paperclip-unpacker/verify.label",
  checked: true,
};

export const runButton: ButtonOption = {
  type: "button",
  id: "paperclip-unpacker/run",
  label: "paperclip-unpacker/run.label",
};

export const manualRunButton: ButtonOption = {
  type: "button",
  id: "paperclip-unpacker/run-manual",
  label: "paperclip-unpacker/run-manual.label",
};

export const actionsGroup = {
  type: "group" as const,
  id: "paperclip-unpacker/actions",
  label: "paperclip-unpacker/actions.label",
  options: [runButton, manualRunButton] as Option[],
};
