// Core data model for the PPL Procedures Memorization app.

export type Action = {
  id: string;
  text: string;
  category?: string;
  value?: string;
  createdAt: string;
  updatedAt: string;
};

export type Procedure = {
  id: string;
  name: string;
  actionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  version: number;
  actions: Action[];
  procedures: Procedure[];
};

export type AppMode = "design" | "learn";

// Suggested helper shape for the overall app state (see spec §14).
export type AppState = {
  data: AppData;
  mode: AppMode;
  selectedProcedureId?: string;
};

export type LearnSessionStats = {
  attempted: number;
  correct: number;
  incorrect: number;
};

export const CURRENT_VERSION = 1;

// An action is either plain text, or a category + value pair (e.g. category
// "מהירות" / "Speed" with value "65 KIAS"). For category+value actions the
// canonical `text` is derived from the two parts using ACTION_SEPARATOR.
export type ActionDraft =
  | { kind: "text"; text: string }
  | { kind: "categoryValue"; category: string; value: string };

export const ACTION_SEPARATOR = " - ";

export function composeActionText(category: string, value: string): string {
  return `${category.trim()}${ACTION_SEPARATOR}${value.trim()}`;
}

export function createEmptyData(): AppData {
  return { version: CURRENT_VERSION, actions: [], procedures: [] };
}
