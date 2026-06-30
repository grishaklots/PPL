// Central app state: a reducer over AppState plus high-level mutation helpers.
// Data is loaded from the bundled ppl-procedures.json (the only source of
// truth); edits are in-memory for the session and exported to persist.

import { useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";

import type { Action, ActionDraft, AppData, AppMode, AppState, Procedure } from "./types";
import { composeActionText } from "./types";
import { newId } from "./ids";
import { loadData } from "./storage";
import { AppContext } from "./appContext";
import type { AppContextValue } from "./appContext";

// Normalize an action draft into the fields stored on an Action, or an error.
type ActionFields = { text: string; category?: string; value?: string };
function draftToFields(draft: ActionDraft): { ok: true; fields: ActionFields } | { ok: false; error: string } {
  if (draft.kind === "text") {
    const text = draft.text.trim();
    if (text.length === 0) {
      return { ok: false, error: "Action text cannot be empty." };
    }
    return { ok: true, fields: { text } };
  }
  const category = draft.category.trim();
  const value = draft.value.trim();
  if (category.length === 0 && value.length === 0) {
    return { ok: false, error: "Category and value cannot be empty." };
  }
  if (category.length === 0) {
    return { ok: false, error: "Category cannot be empty." };
  }
  if (value.length === 0) {
    return { ok: false, error: "Value cannot be empty." };
  }
  return { ok: true, fields: { text: composeActionText(category, value), category, value } };
}

type ReducerAction =
  | { type: "SET_MODE"; mode: AppMode }
  | { type: "SELECT_PROCEDURE"; id?: string }
  | { type: "REPLACE_DATA"; data: AppData }
  | { type: "INSERT_ACTION"; action: Action }
  | { type: "UPDATE_ACTION"; id: string; text: string; category?: string; value?: string; updatedAt: string }
  | { type: "DELETE_ACTION"; id: string; updatedAt: string }
  | { type: "INSERT_PROCEDURE"; procedure: Procedure }
  | { type: "UPDATE_PROCEDURE_NAME"; id: string; name: string; updatedAt: string }
  | { type: "DELETE_PROCEDURE"; id: string }
  | { type: "SET_PROCEDURE_ACTIONS"; id: string; actionIds: string[]; updatedAt: string };

function reducer(state: AppState, action: ReducerAction): AppState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode };

    case "SELECT_PROCEDURE":
      return { ...state, selectedProcedureId: action.id };

    case "REPLACE_DATA": {
      const stillExists = state.selectedProcedureId
        ? action.data.procedures.some((p) => p.id === state.selectedProcedureId)
        : false;
      return {
        ...state,
        data: action.data,
        selectedProcedureId: stillExists ? state.selectedProcedureId : undefined,
      };
    }

    case "INSERT_ACTION":
      return {
        ...state,
        data: { ...state.data, actions: [...state.data.actions, action.action] },
      };

    case "UPDATE_ACTION":
      return {
        ...state,
        data: {
          ...state.data,
          actions: state.data.actions.map((a) =>
            a.id === action.id
              ? {
                  ...a,
                  text: action.text,
                  category: action.category,
                  value: action.value,
                  updatedAt: action.updatedAt,
                }
              : a,
          ),
        },
      };

    case "DELETE_ACTION":
      return {
        ...state,
        data: {
          ...state.data,
          actions: state.data.actions.filter((a) => a.id !== action.id),
          procedures: state.data.procedures.map((p) =>
            p.actionIds.includes(action.id)
              ? {
                  ...p,
                  actionIds: p.actionIds.filter((aid) => aid !== action.id),
                  updatedAt: action.updatedAt,
                }
              : p,
          ),
        },
      };

    case "INSERT_PROCEDURE":
      return {
        ...state,
        data: { ...state.data, procedures: [...state.data.procedures, action.procedure] },
      };

    case "UPDATE_PROCEDURE_NAME":
      return {
        ...state,
        data: {
          ...state.data,
          procedures: state.data.procedures.map((p) =>
            p.id === action.id ? { ...p, name: action.name, updatedAt: action.updatedAt } : p,
          ),
        },
      };

    case "DELETE_PROCEDURE":
      return {
        ...state,
        selectedProcedureId:
          state.selectedProcedureId === action.id ? undefined : state.selectedProcedureId,
        data: {
          ...state.data,
          procedures: state.data.procedures.filter((p) => p.id !== action.id),
        },
      };

    case "SET_PROCEDURE_ACTIONS":
      return {
        ...state,
        data: {
          ...state.data,
          procedures: state.data.procedures.map((p) =>
            p.id === action.id
              ? { ...p, actionIds: action.actionIds, updatedAt: action.updatedAt }
              : p,
          ),
        },
      };

    default:
      return state;
  }
}

function init(): AppState {
  return { data: loadData(), mode: "design", selectedProcedureId: undefined };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Keep a ref to the latest state so helper functions read fresh data without
  // being recreated on every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  // No localStorage persistence: the bundled ppl-procedures.json is the only
  // source of truth (see storage.loadData). Edits live in memory for the
  // session; export a new JSON and commit it to persist them.

  // Helper functions are stable (they read fresh data via stateRef). They are
  // memoized once so consumers don't re-subscribe on every render.
  const helpers = useMemo<Omit<AppContextValue, "state">>(() => {
    const nowIso = () => new Date().toISOString();

    return {
      setMode: (mode: AppMode) => dispatch({ type: "SET_MODE", mode }),
      selectProcedure: (id) => dispatch({ type: "SELECT_PROCEDURE", id }),
      replaceData: (data) => dispatch({ type: "REPLACE_DATA", data }),

      addAction: (draft) => {
        const parsed = draftToFields(draft);
        if (!parsed.ok) {
          return { ok: false, error: parsed.error };
        }
        const { text, category, value } = parsed.fields;
        const exists = stateRef.current.data.actions.some((a) => a.text === text);
        if (exists) {
          return { ok: false, error: "An action with this exact text already exists." };
        }
        const ts = nowIso();
        const action: Action = { id: newId(), text, category, value, createdAt: ts, updatedAt: ts };
        dispatch({ type: "INSERT_ACTION", action });
        return { ok: true, value: action };
      },

      updateAction: (id, draft) => {
        const parsed = draftToFields(draft);
        if (!parsed.ok) {
          return { ok: false, error: parsed.error };
        }
        const { text, category, value } = parsed.fields;
        const exists = stateRef.current.data.actions.some((a) => a.id !== id && a.text === text);
        if (exists) {
          return { ok: false, error: "Another action with this exact text already exists." };
        }
        const updatedAt = nowIso();
        dispatch({ type: "UPDATE_ACTION", id, text, category, value, updatedAt });
        const updated = stateRef.current.data.actions.find((a) => a.id === id);
        return updated
          ? { ok: true, value: { ...updated, text, category, value, updatedAt } }
          : { ok: false, error: "Action not found." };
      },

      deleteAction: (id) => dispatch({ type: "DELETE_ACTION", id, updatedAt: nowIso() }),

      proceduresUsingAction: (id) =>
        stateRef.current.data.procedures.filter((p) => p.actionIds.includes(id)),

      addProcedure: (rawName) => {
        const name = rawName.trim();
        if (name.length === 0) {
          return { ok: false, error: "Procedure name cannot be empty." };
        }
        const exists = stateRef.current.data.procedures.some((p) => p.name === name);
        if (exists) {
          return { ok: false, error: "A procedure with this exact name already exists." };
        }
        const ts = nowIso();
        const procedure: Procedure = {
          id: newId(),
          name,
          actionIds: [],
          createdAt: ts,
          updatedAt: ts,
        };
        dispatch({ type: "INSERT_PROCEDURE", procedure });
        return { ok: true, value: procedure };
      },

      renameProcedure: (id, rawName) => {
        const name = rawName.trim();
        if (name.length === 0) {
          return { ok: false, error: "Procedure name cannot be empty." };
        }
        const exists = stateRef.current.data.procedures.some(
          (p) => p.id !== id && p.name === name,
        );
        if (exists) {
          return { ok: false, error: "Another procedure with this exact name already exists." };
        }
        const updatedAt = nowIso();
        dispatch({ type: "UPDATE_PROCEDURE_NAME", id, name, updatedAt });
        const updated = stateRef.current.data.procedures.find((p) => p.id === id);
        return updated
          ? { ok: true, value: { ...updated, name, updatedAt } }
          : { ok: false, error: "Procedure not found." };
      },

      deleteProcedure: (id) => dispatch({ type: "DELETE_PROCEDURE", id }),

      duplicateProcedure: (id) => {
        const original = stateRef.current.data.procedures.find((p) => p.id === id);
        if (!original) {
          return { ok: false, error: "Procedure not found." };
        }
        const base = `${original.name} (copy)`;
        let name = base;
        let counter = 2;
        while (stateRef.current.data.procedures.some((p) => p.name === name)) {
          name = `${base} ${counter}`;
          counter += 1;
        }
        const ts = nowIso();
        const procedure: Procedure = {
          id: newId(),
          name,
          actionIds: [...original.actionIds],
          createdAt: ts,
          updatedAt: ts,
        };
        dispatch({ type: "INSERT_PROCEDURE", procedure });
        return { ok: true, value: procedure };
      },

      addActionToProcedure: (procedureId, actionId) => {
        const proc = stateRef.current.data.procedures.find((p) => p.id === procedureId);
        if (!proc) return;
        const actionIds = [...proc.actionIds, actionId];
        dispatch({ type: "SET_PROCEDURE_ACTIONS", id: procedureId, actionIds, updatedAt: nowIso() });
      },

      removeActionFromProcedure: (procedureId, index) => {
        const proc = stateRef.current.data.procedures.find((p) => p.id === procedureId);
        if (!proc || index < 0 || index >= proc.actionIds.length) return;
        const actionIds = proc.actionIds.filter((_, i) => i !== index);
        dispatch({ type: "SET_PROCEDURE_ACTIONS", id: procedureId, actionIds, updatedAt: nowIso() });
      },

      moveActionInProcedure: (procedureId, index, direction) => {
        const proc = stateRef.current.data.procedures.find((p) => p.id === procedureId);
        if (!proc) return;
        const target = index + direction;
        if (index < 0 || index >= proc.actionIds.length) return;
        if (target < 0 || target >= proc.actionIds.length) return;
        const actionIds = [...proc.actionIds];
        const [moved] = actionIds.splice(index, 1);
        actionIds.splice(target, 0, moved);
        dispatch({ type: "SET_PROCEDURE_ACTIONS", id: procedureId, actionIds, updatedAt: nowIso() });
      },

      setProcedureActions: (procedureId, actionIds) => {
        const proc = stateRef.current.data.procedures.find((p) => p.id === procedureId);
        if (!proc) return;
        dispatch({ type: "SET_PROCEDURE_ACTIONS", id: procedureId, actionIds, updatedAt: nowIso() });
      },
    };
  }, []);

  const value = useMemo<AppContextValue>(() => ({ state, ...helpers }), [state, helpers]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
