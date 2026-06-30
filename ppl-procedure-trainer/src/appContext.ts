// React context + hook for the app state. Kept separate from the provider so
// that the provider module only exports a component (fast-refresh friendly).

import { createContext, useContext } from "react";
import type { Action, ActionDraft, AppData, AppMode, AppState, Procedure } from "./types";

export type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type AppContextValue = {
  state: AppState;

  // Navigation
  setMode: (mode: AppMode) => void;
  selectProcedure: (id?: string) => void;

  // Import
  replaceData: (data: AppData) => void;

  // Action CRUD
  addAction: (draft: ActionDraft) => MutationResult<Action>;
  updateAction: (id: string, draft: ActionDraft) => MutationResult<Action>;
  deleteAction: (id: string) => void;
  proceduresUsingAction: (id: string) => Procedure[];

  // Procedure CRUD
  addProcedure: (name: string) => MutationResult<Procedure>;
  renameProcedure: (id: string, name: string) => MutationResult<Procedure>;
  deleteProcedure: (id: string) => void;
  duplicateProcedure: (id: string) => MutationResult<Procedure>;

  // Procedure sequence editing
  addActionToProcedure: (procedureId: string, actionId: string) => void;
  removeActionFromProcedure: (procedureId: string, index: number) => void;
  moveActionInProcedure: (procedureId: string, index: number, direction: -1 | 1) => void;
  setProcedureActions: (procedureId: string, actionIds: string[]) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
