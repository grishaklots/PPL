import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Action } from "../types";
import { groupActionsByCategory } from "../actionGroups";
import { DND_ACTION_ID } from "../dnd";

type Props = {
  actions: Action[];
  onAdd: (actionId: string) => void;
  disabled?: boolean;
  renderBadge?: (action: Action) => ReactNode;
  addLabelFor?: (action: Action) => string;
  emptyText: string;
  ungroupedLabel?: string;
};

/**
 * A pool of available actions, grouped by category. Each category is shown on
 * its own row as a label followed by compact, wrapping value chips. Plain-text
 * ("Other") actions are listed one per row. Every action can be added with a
 * click and dragged (carries its action id) onto a droppable sequence.
 */
export function ActionBag({
  actions,
  onAdd,
  disabled,
  renderBadge,
  addLabelFor,
  emptyText,
  ungroupedLabel = "Other",
}: Props) {
  const groups = useMemo(() => groupActionsByCategory(actions), [actions]);

  if (actions.length === 0) {
    return <p className="empty">{emptyText}</p>;
  }

  function dragProps(action: Action) {
    if (disabled) return {};
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData(DND_ACTION_ID, action.id);
        e.dataTransfer.setData("text/plain", action.text);
        e.dataTransfer.effectAllowed = "copy";
      },
    };
  }

  return (
    <div className="action-bag">
      {groups.map((group) =>
        group.category ? (
          <div className="action-group-row" key={group.key}>
            <span className="action-group-label" title={group.category}>
              {group.category}
            </span>
            <div className="chip-row">
              {group.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="chip"
                  disabled={disabled}
                  title={action.text}
                  aria-label={addLabelFor ? addLabelFor(action) : `Add action "${action.text}"`}
                  onClick={() => onAdd(action.id)}
                  {...dragProps(action)}
                >
                  <span className="chip-text">{action.value ?? action.text}</span>
                  {renderBadge?.(action)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="action-group" key={group.key}>
            <p className="action-group-title">
              <span>{ungroupedLabel}</span>
              <span className="action-group-count">{group.actions.length}</span>
            </p>
            <ul className="bag-list">
              {group.actions.map((action) => (
                <li
                  key={action.id}
                  className={`bag-item${disabled ? "" : " draggable"}`}
                  {...dragProps(action)}
                >
                  {!disabled && (
                    <span className="drag-handle" aria-hidden="true">
                      ⠿
                    </span>
                  )}
                  <span className="item-text">{action.text}</span>
                  {renderBadge?.(action)}
                  <button
                    type="button"
                    className="add-button"
                    disabled={disabled}
                    aria-label={
                      addLabelFor ? addLabelFor(action) : `Add action "${action.text}"`
                    }
                    onClick={() => onAdd(action.id)}
                  >
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
