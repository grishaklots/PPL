import { useMemo, useState } from "react";
import { useApp } from "../appContext";
import type { Action, ActionDraft } from "../types";
import { ActionForm } from "./ActionForm";
import { ActionBag } from "./ActionBag";
import { DraggableSequence } from "./DraggableSequence";
import { reorderList } from "../dnd";

type Props = { procedureId: string };

export function ProcedureEditor({ procedureId }: Props) {
  const {
    state,
    renameProcedure,
    addActionToProcedure,
    removeActionFromProcedure,
    moveActionInProcedure,
    setProcedureActions,
    addAction,
  } = useApp();

  const procedure = state.data.procedures.find((p) => p.id === procedureId);

  const actionsById = useMemo(() => {
    const map = new Map<string, Action>();
    for (const a of state.data.actions) map.set(a.id, a);
    return map;
  }, [state.data.actions]);

  // Name editing
  const [nameDraft, setNameDraft] = useState(procedure ? procedure.name : "");
  const [nameError, setNameError] = useState<string | null>(null);

  // Available actions bag
  const [bagSearch, setBagSearch] = useState("");

  // Create new action inline
  const [addToProcedure, setAddToProcedure] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredBag = useMemo(() => {
    const q = bagSearch.trim().toLowerCase();
    return q
      ? state.data.actions.filter((a) => a.text.toLowerCase().includes(q))
      : state.data.actions;
  }, [state.data.actions, bagSearch]);

  if (!procedure) {
    return (
      <section className="panel">
        <p className="empty">This procedure no longer exists.</p>
      </section>
    );
  }

  function commitName() {
    if (!procedure) return;
    if (nameDraft.trim() === procedure.name) {
      setNameError(null);
      return;
    }
    const result = renameProcedure(procedure.id, nameDraft);
    setNameError(result.ok ? null : result.error);
  }

  function confirmDuplicate(actionId: string): boolean {
    if (!procedure || !procedure.actionIds.includes(actionId)) return true;
    return window.confirm(
      "This action is already in the procedure. Add it again as a duplicate step?",
    );
  }

  function handleAddFromBag(actionId: string) {
    if (!procedure) return;
    if (!confirmDuplicate(actionId)) return;
    addActionToProcedure(procedure.id, actionId);
  }

  function handleInsertFromBag(actionId: string, insertAt: number) {
    if (!procedure) return;
    if (!confirmDuplicate(actionId)) return;
    const next = procedure.actionIds.slice();
    next.splice(insertAt, 0, actionId);
    setProcedureActions(procedure.id, next);
  }

  function handleReorder(from: number, insertAt: number) {
    if (!procedure) return;
    setProcedureActions(procedure.id, reorderList(procedure.actionIds, from, insertAt));
  }

  function handleCreateAction(draft: ActionDraft): boolean {
    const result = addAction(draft);
    if (!result.ok) {
      setCreateError(result.error);
      return false;
    }
    setCreateError(null);
    if (addToProcedure && procedure) {
      addActionToProcedure(procedure.id, result.value.id);
    }
    return true;
  }

  const sequenceCount = procedure.actionIds.length;

  return (
    <section className="panel editor" aria-labelledby="editor-heading">
      <h2 id="editor-heading">Edit Procedure</h2>

      <div className="field-row">
        <label htmlFor="procedure-name">Procedure name</label>
        <input
          id="procedure-name"
          type="text"
          value={nameDraft}
          onChange={(e) => {
            setNameDraft(e.target.value);
            if (nameError) setNameError(null);
          }}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitName();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      {nameError && (
        <p className="error" role="alert">
          {nameError}
        </p>
      )}

      <div className="editor-grid">
        {/* Procedure Sequence */}
        <div className="editor-col">
          <h3>Procedure Sequence ({sequenceCount})</h3>
          <DraggableSequence
            itemIds={procedure.actionIds}
            getText={(id) => actionsById.get(id)?.text ?? "(missing action)"}
            emptyHint="No actions yet. Drag actions here, use the Add button, or create a new one."
            onReorder={handleReorder}
            onMove={(index, dir) => moveActionInProcedure(procedure.id, index, dir)}
            onRemove={(index) => removeActionFromProcedure(procedure.id, index)}
            onAddExternal={handleInsertFromBag}
          />
        </div>

        {/* Available Actions Bag */}
        <div className="editor-col">
          <h3>Available Actions ({state.data.actions.length})</h3>

          <div className="create-action">
            <p className="create-action-title">Create a new action</p>
            <ActionForm
              submitLabel="Create"
              error={createError}
              resetOnSuccess
              onSubmit={handleCreateAction}
              onDirty={() => setCreateError(null)}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={addToProcedure}
                onChange={(e) => setAddToProcedure(e.target.checked)}
              />
              Add new action to this procedure
            </label>
          </div>

          <div className="field-row">
            <label className="visually-hidden" htmlFor="bag-search">
              Search available actions
            </label>
            <input
              id="bag-search"
              type="search"
              placeholder="Search available actions…"
              value={bagSearch}
              onChange={(e) => setBagSearch(e.target.value)}
            />
          </div>

          {filteredBag.length === 0 ? (
            <p className="empty">
              {state.data.actions.length === 0
                ? "No actions exist yet. Create one above."
                : "No actions match your search."}
            </p>
          ) : (
            <ActionBag
              actions={filteredBag}
              onAdd={handleAddFromBag}
              addLabelFor={(a) => `Add action "${a.text}" to procedure`}
              emptyText="No actions match your search."
              renderBadge={(a) =>
                procedure.actionIds.includes(a.id) ? (
                  <span className="badge badge-neutral" title="In procedure" aria-label="In procedure">
                    ✓
                  </span>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
