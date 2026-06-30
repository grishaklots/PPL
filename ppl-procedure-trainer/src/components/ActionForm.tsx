import { useId, useState } from "react";
import type { ActionDraft } from "../types";

export type ActionFormInitial =
  | { kind: "text"; text: string }
  | { kind: "categoryValue"; category: string; value: string };

type Props = {
  submitLabel: string;
  error?: string | null;
  initial?: ActionFormInitial;
  resetOnSuccess?: boolean;
  onSubmit: (draft: ActionDraft) => boolean;
  onCancel?: () => void;
  onDirty?: () => void;
};

/**
 * Form for creating/editing an action. Two text boxes are always shown: the
 * first is the action/instrument (or category), the second is its value. If the
 * value box is left empty the action is treated as plain text (a "category with
 * no value"). `onSubmit` returns true on success so the form can clear itself
 * when `resetOnSuccess` is set.
 */
export function ActionForm({
  submitLabel,
  error,
  initial,
  resetOnSuccess,
  onSubmit,
  onCancel,
  onDirty,
}: Props) {
  const ids = useId();
  const [primary, setPrimary] = useState(
    initial?.kind === "categoryValue"
      ? initial.category
      : initial?.kind === "text"
        ? initial.text
        : "",
  );
  const [value, setValue] = useState(
    initial?.kind === "categoryValue" ? initial.value : "",
  );

  function dirty() {
    if (onDirty) onDirty();
  }

  function submit() {
    const draft: ActionDraft =
      primary.trim().length > 0 && value.trim().length > 0
        ? { kind: "categoryValue", category: primary, value }
        : { kind: "text", text: primary };
    const ok = onSubmit(draft);
    if (ok && resetOnSuccess) {
      setPrimary("");
      setValue("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="action-form">
      <div className="field-row">
        <label className="visually-hidden" htmlFor={`${ids}-primary`}>
          פעולה או מכשיר
        </label>
        <input
          id={`${ids}-primary`}
          type="text"
          placeholder="פעולה או מכשיר"
          value={primary}
          onChange={(e) => {
            setPrimary(e.target.value);
            dirty();
          }}
          onKeyDown={onKeyDown}
        />
        <span className="cv-separator" aria-hidden="true">
          –
        </span>
        <label className="visually-hidden" htmlFor={`${ids}-value`}>
          ערך או פעולה
        </label>
        <input
          id={`${ids}-value`}
          type="text"
          placeholder="ערך או פעולה"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            dirty();
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
