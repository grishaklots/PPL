// LocalStorage persistence + JSON import/export with validation.

import type { Action, AppData, Procedure } from "./types";
import { CURRENT_VERSION, composeActionText, createEmptyData } from "./types";
import seedJson from "./ppl-procedures.json";

export const STORAGE_KEY = "ppl-procedure-trainer-v1";

export type ValidationResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Validate and normalize an unknown value into AppData.
 *
 * Required (spec §8 "Import validation"):
 *   - top level: version, actions, procedures
 *   - each action: id, text
 *   - each procedure: id, name, actionIds
 * Unknown fields are ignored. Procedures that reference unknown action IDs are
 * rejected with a clear error (v1 behaviour).
 */
export function validateAppData(raw: unknown): ValidationResult {
  if (!isObject(raw)) {
    return { ok: false, error: "Root JSON must be an object." };
  }

  if (typeof raw.version !== "number") {
    return { ok: false, error: 'Missing or invalid "version" (expected a number).' };
  }
  if (!Array.isArray(raw.actions)) {
    return { ok: false, error: 'Missing or invalid "actions" (expected an array).' };
  }
  if (!Array.isArray(raw.procedures)) {
    return { ok: false, error: 'Missing or invalid "procedures" (expected an array).' };
  }

  const actions: Action[] = [];
  const actionIdSet = new Set<string>();
  for (let i = 0; i < raw.actions.length; i++) {
    const a = raw.actions[i];
    if (!isObject(a)) {
      return { ok: false, error: `Action #${i + 1} is not an object.` };
    }
    if (typeof a.id !== "string" || a.id.length === 0) {
      return { ok: false, error: `Action #${i + 1} is missing a valid "id".` };
    }
    if (actionIdSet.has(a.id)) {
      return { ok: false, error: `Duplicate action id "${a.id}".` };
    }

    // An action is either plain text, or a category + value pair. For the
    // latter the canonical text is derived from the two parts.
    const hasCategory = typeof a.category === "string" && a.category.trim().length > 0;
    const hasValue = typeof a.value === "string" && a.value.trim().length > 0;
    let text: string;
    let category: string | undefined;
    let value: string | undefined;
    if (hasCategory && hasValue) {
      category = (a.category as string).trim();
      value = (a.value as string).trim();
      text = composeActionText(category, value);
    } else {
      if (typeof a.text !== "string") {
        return { ok: false, error: `Action "${a.id}" is missing a valid "text".` };
      }
      text = a.text;
    }

    actionIdSet.add(a.id);
    actions.push({
      id: a.id,
      text,
      category,
      value,
      createdAt: typeof a.createdAt === "string" ? a.createdAt : nowIso(),
      updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : nowIso(),
    });
  }

  const procedures: Procedure[] = [];
  const procIdSet = new Set<string>();
  for (let i = 0; i < raw.procedures.length; i++) {
    const p = raw.procedures[i];
    if (!isObject(p)) {
      return { ok: false, error: `Procedure #${i + 1} is not an object.` };
    }
    if (typeof p.id !== "string" || p.id.length === 0) {
      return { ok: false, error: `Procedure #${i + 1} is missing a valid "id".` };
    }
    if (typeof p.name !== "string") {
      return { ok: false, error: `Procedure "${p.id}" is missing a valid "name".` };
    }
    if (!Array.isArray(p.actionIds)) {
      return { ok: false, error: `Procedure "${p.name || p.id}" is missing a valid "actionIds" array.` };
    }
    if (procIdSet.has(p.id)) {
      return { ok: false, error: `Duplicate procedure id "${p.id}".` };
    }
    procIdSet.add(p.id);

    const actionIds: string[] = [];
    for (const aid of p.actionIds) {
      if (typeof aid !== "string") {
        return { ok: false, error: `Procedure "${p.name || p.id}" has a non-string action id.` };
      }
      if (!actionIdSet.has(aid)) {
        return {
          ok: false,
          error: `Procedure "${p.name || p.id}" references unknown action id "${aid}".`,
        };
      }
      actionIds.push(aid);
    }

    procedures.push({
      id: p.id,
      name: p.name,
      actionIds,
      createdAt: typeof p.createdAt === "string" ? p.createdAt : nowIso(),
      updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : nowIso(),
    });
  }

  return {
    ok: true,
    data: { version: CURRENT_VERSION, actions, procedures },
  };
}

// ---------------------------------------------------------------------------
// Seed (content baked into the build)
// ---------------------------------------------------------------------------

/**
 * The bundled dataset (src/ppl-procedures.json) — the single source of truth
 * for the app. Validated/normalized defensively.
 */
export function getSeedData(): AppData {
  const result = validateAppData(seedJson);
  if (result.ok) return result.data;
  console.warn("Bundled ppl-procedures.json is invalid, starting empty:", result.error);
  return createEmptyData();
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/**
 * The app ALWAYS loads its data from the bundled `ppl-procedures.json` — that
 * file is the only source of truth. Edits made in the app live in memory for
 * the session only; to persist them, export a new JSON and commit it to the
 * repo. (We also clear any legacy localStorage so it can never shadow the file.)
 */
export function loadData(): AppData {
  clearStoredData();
  return getSeedData();
}

export function clearStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear stored data:", err);
  }
}

// ---------------------------------------------------------------------------
// JSON import / export
// ---------------------------------------------------------------------------

export function exportFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `ppl-procedures-${y}-${m}-${d}.json`;
}

function triggerDownload(data: AppData, filename: string): void {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJson(data: AppData): void {
  triggerDownload(data, exportFilename());
}

/** Download the current data as `ppl-procedures.json` for baking into the build. */
export function downloadSeed(data: AppData): void {
  triggerDownload(data, "ppl-procedures.json");
}

export function parseImport(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  return validateAppData(parsed);
}
