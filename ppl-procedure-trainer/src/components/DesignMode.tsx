import { useApp } from "../appContext";
import { ProcedureList } from "./ProcedureList";
import { ProcedureEditor } from "./ProcedureEditor";
import { ActionManager } from "./ActionManager";

export function DesignMode() {
  const { state } = useApp();
  const selectedId = state.selectedProcedureId;
  const selectedExists =
    selectedId !== undefined && state.data.procedures.some((p) => p.id === selectedId);

  return (
    <div className="design-mode">
      <div className="design-top">
        <aside className="design-sidebar">
          <ProcedureList />
        </aside>
        <main className="design-main">
          {selectedExists && selectedId ? (
            <ProcedureEditor key={selectedId} procedureId={selectedId} />
          ) : (
            <section className="panel">
              <p className="empty">
                Select a procedure from the list to edit it, or create a new one.
              </p>
            </section>
          )}
        </main>
      </div>
      <ActionManager />
    </div>
  );
}
