import { useMemo, useState } from "react";
import { useApp } from "../appContext";

export function ProcedureList() {
  const { state, addProcedure, deleteProcedure, duplicateProcedure, selectProcedure } = useApp();
  const procedures = state.data.procedures;
  const selectedId = state.selectedProcedureId;

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? procedures.filter((p) => p.name.toLowerCase().includes(q))
      : procedures.slice();
    return list.sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [procedures, search]);

  function handleAdd() {
    const result = addProcedure(newName);
    if (result.ok) {
      setNewName("");
      setError(null);
      selectProcedure(result.value.id);
    } else {
      setError(result.error);
    }
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete procedure "${name}"? This cannot be undone.`)) {
      deleteProcedure(id);
    }
  }

  function handleDuplicate(id: string) {
    const result = duplicateProcedure(id);
    if (result.ok) {
      selectProcedure(result.value.id);
    }
  }

  return (
    <section className="panel" aria-labelledby="procedure-list-heading">
      <h2 id="procedure-list-heading">Procedures ({procedures.length})</h2>

      <div className="field-row">
        <label className="visually-hidden" htmlFor="new-procedure-name">
          New procedure name
        </label>
        <input
          id="new-procedure-name"
          type="text"
          placeholder="New procedure name… / שם נוהל חדש…"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <button type="button" onClick={handleAdd}>
          Add
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {procedures.length > 3 && (
        <div className="field-row">
          <label className="visually-hidden" htmlFor="procedure-search">
            Search procedures
          </label>
          <input
            id="procedure-search"
            type="search"
            placeholder="Search procedures…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="empty">
          {procedures.length === 0
            ? "No procedures yet. Create one above."
            : "No procedures match your search."}
        </p>
      ) : (
        <ul className="item-list">
          {filtered.map((proc) => {
            const isSelected = proc.id === selectedId;
            const count = proc.actionIds.length;
            return (
              <li key={proc.id} className={`item ${isSelected ? "item-selected" : ""}`}>
                <button
                  type="button"
                  className="select-button"
                  aria-pressed={isSelected}
                  onClick={() => selectProcedure(proc.id)}
                >
                  <span className="item-text">{proc.name}</span>
                  <span className={`badge ${count === 0 ? "badge-warn" : "badge-neutral"}`}>
                    {count === 0 ? "No actions" : `${count} step${count === 1 ? "" : "s"}`}
                  </span>
                </button>
                <span className="item-actions">
                  <button type="button" className="ghost" onClick={() => handleDuplicate(proc.id)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(proc.id, proc.name)}
                  >
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
