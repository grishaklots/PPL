import { useMemo, useState } from "react";
import { useApp } from "../appContext";
import type { Action, ActionDraft } from "../types";
import { ActionForm } from "./ActionForm";
import type { ActionFormInitial } from "./ActionForm";
import { groupActionsByCategory } from "../actionGroups";

function initialFromAction(action: Action): ActionFormInitial {
  if (action.category && action.value) {
    return { kind: "categoryValue", category: action.category, value: action.value };
  }
  return { kind: "text", text: action.text };
}

export function ActionManager() {
  const { state, addAction, updateAction, deleteAction, proceduresUsingAction } = useApp();
  const actions = state.data.actions;

  const [search, setSearch] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? actions.filter((a) => a.text.toLowerCase().includes(q)) : actions;
  }, [actions, search]);

  const groups = useMemo(() => groupActionsByCategory(filtered), [filtered]);

  function handleAdd(draft: ActionDraft): boolean {
    const result = addAction(draft);
    if (result.ok) {
      setAddError(null);
      return true;
    }
    setAddError(result.error);
    return false;
  }

  function startEdit(action: Action) {
    setEditingId(action.id);
    setEditError(null);
  }

  function saveEdit(id: string, draft: ActionDraft): boolean {
    const result = updateAction(id, draft);
    if (result.ok) {
      setEditingId(null);
      setEditError(null);
      return true;
    }
    setEditError(result.error);
    return false;
  }

  function handleDelete(action: Action) {
    const using = proceduresUsingAction(action.id);
    if (using.length === 0) {
      if (window.confirm(`Delete action "${action.text}"?`)) {
        deleteAction(action.id);
      }
      return;
    }
    const names = using.map((p) => `\u2022 ${p.name}`).join("\n");
    const message =
      `The action "${action.text}" is used by ${using.length} procedure(s):\n\n${names}\n\n` +
      `Deleting it will remove it from all of these procedures. Continue?`;
    if (window.confirm(message)) {
      deleteAction(action.id);
    }
  }

  return (
    <section className="panel" aria-labelledby="action-manager-heading">
      <h2 id="action-manager-heading">Global Actions ({actions.length})</h2>
      <p className="hint">
        Reusable steps. Editing an action updates it everywhere it is used.
      </p>

      <div className="field-row">
        <label className="visually-hidden" htmlFor="action-search">
          Search actions
        </label>
        <input
          id="action-search"
          type="search"
          placeholder="Search actions… / חיפוש פעולות…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ActionForm
        submitLabel="Add action"
        error={addError}
        resetOnSuccess
        onSubmit={handleAdd}
        onDirty={() => setAddError(null)}
      />

      {filtered.length === 0 ? (
        <p className="empty">
          {actions.length === 0
            ? "No actions yet. Add your first action above."
            : "No actions match your search."}
        </p>
      ) : (
        <div className="action-bag">
          {groups.map((group) => (
            <div className="action-group" key={group.key}>
              <p className="action-group-title">
                <span>{group.category ?? "Other"}</span>
                <span className="action-group-count">{group.actions.length}</span>
              </p>
              <ul className="item-list">
                {group.actions.map((action) => {
                  const usedBy = proceduresUsingAction(action.id).length;
                  const isEditing = editingId === action.id;
                  const label = group.category ? action.value ?? action.text : action.text;
                  return (
                    <li key={action.id} className="item">
                      {isEditing ? (
                        <div className="edit-row">
                          <ActionForm
                            submitLabel="Save"
                            error={editError}
                            initial={initialFromAction(action)}
                            onSubmit={(draft) => saveEdit(action.id, draft)}
                            onCancel={() => {
                              setEditingId(null);
                              setEditError(null);
                            }}
                            onDirty={() => setEditError(null)}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="item-text">{label}</span>
                          <span
                            className={`badge ${usedBy > 0 ? "badge-used" : "badge-unused"}`}
                          >
                            {usedBy > 0 ? `Used by ${usedBy}` : "Unused"}
                          </span>
                          <span className="item-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => startEdit(action)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(action)}
                            >
                              Delete
                            </button>
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
