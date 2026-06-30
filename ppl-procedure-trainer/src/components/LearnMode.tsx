import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../appContext";
import type { Action, Procedure } from "../types";
import { compareAnswer } from "../compare";
import type { Comparison } from "../compare";
import { ActionBag } from "./ActionBag";
import { DraggableSequence } from "./DraggableSequence";
import { reorderList } from "../dnd";
import { nextUnansweredIndex } from "../quiz";

type Phase = "answering" | "reviewing";

function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function validIds(procedures: Procedure[]): string[] {
  return procedures.filter((p) => p.actionIds.length > 0).map((p) => p.id);
}

export function LearnMode() {
  const { state } = useApp();
  const procedures = state.data.procedures;

  const actionsById = useMemo(() => {
    const map = new Map<string, Action>();
    for (const a of state.data.actions) map.set(a.id, a);
    return map;
  }, [state.data.actions]);

  const validProcedures = useMemo(
    () => procedures.filter((p) => p.actionIds.length > 0),
    [procedures],
  );

  // The quiz auto-starts: a freshly shuffled order of all valid procedures.
  const [order, setOrder] = useState<string[]>(() => shuffle(validIds(procedures)));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const [answer, setAnswer] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [bagSearch, setBagSearch] = useState("");
  // In-progress working answers, kept per procedure so navigating away and back
  // restores what the user had built.
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});

  const total = order.length;
  const answeredSet = useMemo(() => new Set(Object.keys(results)), [results]);
  const answeredCount = answeredSet.size;
  const correctCount = Object.values(results).filter(Boolean).length;

  const currentId = order[currentIndex];
  const procedure = currentId ? procedures.find((p) => p.id === currentId) : undefined;
  const editable = phase === "answering" && !finished;

  const bagActions = useMemo(() => {
    const list = state.data.actions
      .slice()
      .sort((a, b) => a.text.localeCompare(b.text, "he"));
    const q = bagSearch.trim().toLowerCase();
    return q ? list.filter((a) => a.text.toLowerCase().includes(q)) : list;
  }, [state.data.actions, bagSearch]);

  function resetAnswerArea() {
    setAnswer([]);
    setComparison(null);
    setShowCorrect(false);
    setBagSearch("");
  }

  function startQuiz() {
    setOrder(shuffle(validIds(procedures)));
    setCurrentIndex(0);
    setResults({});
    setDrafts({});
    setFinished(false);
    setPhase("answering");
    resetAnswerArea();
  }

  // Navigate to another procedure, saving the current working answer as a draft
  // and restoring the target procedure's saved draft (if any).
  function navigateTo(index: number) {
    const fromId = order[currentIndex];
    const toId = order[index];
    const nextDrafts = fromId !== undefined ? { ...drafts, [fromId]: answer } : drafts;
    setDrafts(nextDrafts);
    setCurrentIndex(index);
    setFinished(false);
    setPhase("answering");
    setComparison(null);
    setShowCorrect(false);
    setBagSearch("");
    setAnswer(toId !== undefined ? nextDrafts[toId] ?? [] : []);
  }

  function jumpTo(id: string) {
    const idx = order.indexOf(id);
    if (idx >= 0) navigateTo(idx);
  }

  function handleSubmit() {
    if (!procedure || !currentId) return;
    const result = compareAnswer(answer, procedure.actionIds);
    setComparison(result);
    setResults((prev) => ({ ...prev, [currentId]: result.isCorrect }));
    setPhase("reviewing");
  }

  function handleNext() {
    // results already includes the just-answered current procedure here.
    const idx = nextUnansweredIndex(order, new Set(Object.keys(results)), currentIndex, null);
    if (idx === null) {
      if (currentId !== undefined) {
        setDrafts((prev) => ({ ...prev, [currentId]: answer }));
      }
      setFinished(true);
    } else {
      navigateTo(idx);
    }
  }

  function handleTryAgain() {
    setPhase("answering");
    resetAnswerArea();
  }

  // Answer manipulation (answering phase only) ------------------------------
  function handleAddToAnswer(actionId: string) {
    if (!editable) return;
    setAnswer((prev) => [...prev, actionId]);
  }
  function handleRemoveFromAnswer(index: number) {
    if (!editable) return;
    setAnswer((prev) => prev.filter((_, i) => i !== index));
  }
  function handleMove(index: number, direction: -1 | 1) {
    if (!editable) return;
    setAnswer((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }
  function handleReorderAnswer(from: number, insertAt: number) {
    if (!editable) return;
    setAnswer((prev) => reorderList(prev, from, insertAt));
  }
  function handleInsertIntoAnswer(actionId: string, insertAt: number) {
    if (!editable) return;
    setAnswer((prev) => {
      const next = prev.slice();
      next.splice(insertAt, 0, actionId);
      return next;
    });
  }

  // --- No valid procedures -------------------------------------------------
  if (validProcedures.length === 0) {
    return (
      <section className="panel">
        <h2>Learn Mode</h2>
        <p className="empty">
          There are no procedures with at least one action yet. Switch to{" "}
          <strong>Design Mode</strong> to create procedures first.
        </p>
      </section>
    );
  }

  const remainingAfterCurrent = total - answeredCount; // valid during reviewing (current counted)

  const sidebar = (
    <aside className="learn-sidebar panel" aria-label="Scenarios">
      <button type="button" className="full-quiz-button" onClick={startQuiz}>
        ▶ Start Quiz ({validProcedures.length})
      </button>
      <h3>Scenarios</h3>
      <ul className="scenario-list">
        {order.map((id, idx) => {
          const proc = procedures.find((p) => p.id === id);
          if (!proc) return null;
          const active = idx === currentIndex && !finished;
          const mark = results[id];
          const hasDraft = mark === undefined && !active && (drafts[id]?.length ?? 0) > 0;
          return (
            <li key={id}>
              <button
                type="button"
                className={`scenario-item${active ? " scenario-active" : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => jumpTo(id)}
              >
                <span className="scenario-num" aria-hidden="true">
                  {idx + 1}
                </span>
                <span className="item-text">{proc.name}</span>
                {mark !== undefined ? (
                  <span
                    className={`scenario-mark ${mark ? "mark-correct" : "mark-incorrect"}`}
                    aria-hidden="true"
                  >
                    {mark ? "✓" : "✗"}
                  </span>
                ) : hasDraft ? (
                  <span
                    className="scenario-mark mark-draft"
                    title="In progress"
                    aria-label="In progress"
                  >
                    ●
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );

  return (
    <div className="learn-layout">
      {sidebar}
      <div className="learn-main">{renderMain()}</div>
    </div>
  );

  function renderMain(): ReactNode {
    if (finished) {
      const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);
      return (
        <section className="panel results" aria-labelledby="results-heading">
          <h2 id="results-heading">Quiz complete</h2>
          <p className="results-score">
            You got <strong>{correctCount}</strong> out of <strong>{total}</strong> correct (
            {accuracy}%).
          </p>
          <ol className="results-list">
            {order.map((id, i) => {
              const proc = procedures.find((p) => p.id === id);
              const isCorrect = results[id];
              return (
                <li
                  key={id}
                  className={`result-row ${isCorrect ? "result-correct" : "result-incorrect"}`}
                >
                  <span className="result-index" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="item-text">{proc ? proc.name : "(deleted procedure)"}</span>
                  <span className="result-mark">{isCorrect ? "✓ Correct" : "✗ Incorrect"}</span>
                </li>
              );
            })}
          </ol>
          <div className="button-row">
            <button type="button" onClick={startQuiz}>
              Restart quiz
            </button>
          </div>
        </section>
      );
    }

    if (!procedure) {
      return (
        <section className="panel">
          <h2>Learn Mode</h2>
          <p className="empty">This procedure is no longer available.</p>
          <button type="button" onClick={startQuiz}>
            Start Quiz
          </button>
        </section>
      );
    }

    // Reviewing: feedback replaces the input area so it is visible at the top.
    if (phase === "reviewing" && comparison) {
      const nextLabel = remainingAfterCurrent === 0 ? "See results" : "Next procedure";
      return (
        <Feedback
          comparison={comparison}
          procedure={procedure}
          actionsById={actionsById}
          showCorrect={showCorrect}
          onShowCorrect={() => setShowCorrect(true)}
        >
          <button type="button" className="ghost" onClick={handleTryAgain}>
            Try again
          </button>
          <button type="button" onClick={handleNext}>
            {nextLabel}
          </button>
        </Feedback>
      );
    }

    // Answering
    return (
      <>
        <section className="panel learn-header">
          <div className="learn-header-info">
            <p className="learn-prompt">
              Answered <strong>{answeredCount}</strong> of <strong>{total}</strong> · Correct:{" "}
              <strong>{correctCount}</strong>
            </p>
            <h2 className="procedure-title">{procedure.name}</h2>
          </div>
        </section>

        <div className="editor-grid learn-grid">
          {/* Student answer */}
          <section className="panel editor-col">
            <h3>Your Answer ({answer.length})</h3>
            <div className="learn-scroll">
              <DraggableSequence
                itemIds={answer}
                getText={(id) => actionsById.get(id)?.text ?? "(missing action)"}
                emptyHint="Drag actions here or use the Add button to build your answer."
                readOnly={!editable}
                onReorder={handleReorderAnswer}
                onMove={handleMove}
                onRemove={handleRemoveFromAnswer}
                onAddExternal={handleInsertIntoAnswer}
              />
            </div>
            <div className="button-row">
              <button type="button" onClick={handleSubmit} disabled={answer.length === 0}>
                Submit answer
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setAnswer([])}
                disabled={answer.length === 0}
              >
                Clear answer
              </button>
            </div>
          </section>

          {/* Available actions bag */}
          <section className="panel editor-col">
            <h3>Available Actions ({state.data.actions.length})</h3>
            <div className="field-row">
              <label className="visually-hidden" htmlFor="learn-bag-search">
                Search available actions
              </label>
              <input
                id="learn-bag-search"
                type="search"
                placeholder="Search available actions…"
                value={bagSearch}
                onChange={(e) => setBagSearch(e.target.value)}
              />
            </div>
            <div className="learn-scroll">
              {bagActions.length === 0 ? (
                <p className="empty">No actions match your search.</p>
              ) : (
                <ActionBag
                  actions={bagActions}
                  onAdd={handleAddToAnswer}
                  addLabelFor={(a) => `Add action "${a.text}" to your answer`}
                  emptyText="No actions match your search."
                  renderBadge={(a) => {
                    const usedCount = answer.filter((id) => id === a.id).length;
                    return usedCount > 0 ? (
                      <span className="badge badge-neutral">×{usedCount}</span>
                    ) : null;
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </>
    );
  }
}

type FeedbackProps = {
  comparison: Comparison;
  procedure: Procedure;
  actionsById: Map<string, Action>;
  showCorrect: boolean;
  onShowCorrect: () => void;
  children: ReactNode;
};

const STUDENT_LABELS: Record<string, string> = {
  correct: "✓ Correct position",
  "wrong-position": "↕ Wrong position",
  extra: "✗ Not in procedure",
};

const CORRECT_LABELS: Record<string, string> = {
  correct: "✓ You placed this correctly",
  misplaced: "↕ You had this in the wrong position",
  missing: "✗ Missing from your answer",
};

function Feedback({
  comparison,
  procedure,
  actionsById,
  showCorrect,
  onShowCorrect,
  children,
}: FeedbackProps) {
  const textOf = (id: string) => actionsById.get(id)?.text ?? "(missing action)";

  return (
    <section
      className={`panel feedback ${comparison.isCorrect ? "feedback-correct" : "feedback-incorrect"}`}
      aria-live="polite"
    >
      <div className="feedback-top">
        <h2>{comparison.isCorrect ? "✓ Correct!" : "✗ Not quite"}</h2>
        <p className="feedback-summary">
          {comparison.isCorrect
            ? `Your sequence for “${procedure.name}” is exactly right.`
            : `Your sequence for “${procedure.name}” does not match. See the comparison below.`}
        </p>
        <div className="button-row feedback-actions">
          {!showCorrect && (
            <button type="button" className="ghost" onClick={onShowCorrect}>
              Show correct answer
            </button>
          )}
          {children}
        </div>
      </div>

      {!comparison.isCorrect && (
        <div className="comparison">
          <div className="comparison-col">
            <h3>Your Answer</h3>
            {comparison.studentRows.length === 0 ? (
              <p className="empty">You did not select any actions.</p>
            ) : (
              <ol className="compare-list">
                {comparison.studentRows.map((row, i) => (
                  <li key={`s-${i}`} className={`compare-item status-${row.status}`}>
                    <span className="step-number" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="item-text">{textOf(row.actionId)}</span>
                    <span className="status-label">{STUDENT_LABELS[row.status]}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="comparison-col">
            <h3>Correct Answer</h3>
            <ol className="compare-list">
              {comparison.correctRows.map((row, i) => (
                <li key={`c-${i}`} className={`compare-item status-${row.status}`}>
                  <span className="step-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="item-text">{textOf(row.actionId)}</span>
                  <span className="status-label">{CORRECT_LABELS[row.status]}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {showCorrect && (
        <div className="correct-reveal">
          <h3>Correct sequence for “{procedure.name}”</h3>
          <ol className="sequence-list">
            {procedure.actionIds.map((id, i) => (
              <li key={`r-${i}`} className="sequence-item">
                <span className="step-number" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="item-text">{textOf(id)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
