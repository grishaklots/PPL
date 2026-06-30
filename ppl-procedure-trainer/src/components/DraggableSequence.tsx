import { useRef, useState } from "react";
import {
  DND_ACTION_ID,
  DND_SEQ_INDEX,
  dragHasActionId,
  dragHasSeqIndex,
  insertionIndex,
} from "../dnd";

type Props = {
  itemIds: string[];
  getText: (actionId: string) => string;
  emptyHint: string;
  readOnly?: boolean;
  onReorder: (from: number, insertAt: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAddExternal?: (actionId: string, insertAt: number) => void;
};

const DEFAULT_GAP = 48;

/**
 * An ordered, reorderable sequence of actions. Supports drag-and-drop
 * reordering and accepts actions dragged in from an ActionBag. As you drag, the
 * items live-shift to open a gap at the insertion point; you can drop anywhere
 * inside the list (the position is computed from the pointer, not just edges).
 * Accessible step number + up/down + remove controls are always present.
 */
export function DraggableSequence({
  itemIds,
  getText,
  emptyHint,
  readOnly,
  onReorder,
  onMove,
  onRemove,
  onAddExternal,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [gapPx, setGapPx] = useState(DEFAULT_GAP);

  const count = itemIds.length;

  function clearDrag() {
    setDragIndex(null);
    setDropAt(null);
  }

  function allowsDrop(e: React.DragEvent): boolean {
    if (readOnly) return false;
    return dragHasSeqIndex(e) || (dragHasActionId(e) && onAddExternal !== undefined);
  }

  // Insertion index from the pointer, using layout offsets (offsetTop) which are
  // immune to the CSS transforms used for the shift animation — this keeps the
  // hit-testing stable and lets the user drop anywhere over the list.
  function computeDropAt(clientY: number): number {
    const ol = listRef.current;
    if (!ol) return count;
    const items = Array.from(ol.querySelectorAll<HTMLElement>(":scope > .sequence-item"));
    if (items.length === 0) return 0;
    const top = ol.getBoundingClientRect().top;
    const pointerY = clientY - top + ol.scrollTop;
    return insertionIndex(
      pointerY,
      items.map((el) => ({ top: el.offsetTop, height: el.offsetHeight })),
    );
  }

  function onContainerDragOver(e: React.DragEvent) {
    if (!allowsDrop(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragHasSeqIndex(e) ? "move" : "copy";
    const at = computeDropAt(e.clientY);
    if (at !== dropAt) setDropAt(at);
  }

  function onContainerDrop(e: React.DragEvent) {
    if (!allowsDrop(e)) return;
    e.preventDefault();
    const at = computeDropAt(e.clientY);

    if (dragHasSeqIndex(e)) {
      const from = Number(e.dataTransfer.getData(DND_SEQ_INDEX));
      if (!Number.isNaN(from) && at !== from && at !== from + 1) {
        onReorder(from, at);
      }
    } else if (onAddExternal) {
      const actionId = e.dataTransfer.getData(DND_ACTION_ID);
      if (actionId) onAddExternal(actionId, at);
    }
    clearDrag();
  }

  function onContainerDragLeave(e: React.DragEvent) {
    const next = e.relatedTarget as Node | null;
    if (!next || !listRef.current || !listRef.current.contains(next)) {
      setDropAt(null);
    }
  }

  // When reordering, dropping right before or after the dragged item is a no-op,
  // so we don't open a gap or show an indicator in those positions.
  const isNoop = dragIndex !== null && dropAt !== null && (dropAt === dragIndex || dropAt === dragIndex + 1);
  const activeDropAt = dropAt !== null && !isNoop ? dropAt : null;

  function itemClassName(index: number): string {
    let cls = "sequence-item";
    if (!readOnly) cls += " draggable";
    if (dragIndex === index) cls += " dragging";
    if (index === dragIndex) return cls;
    if (activeDropAt !== null && index === activeDropAt) cls += " drop-before";
    if (activeDropAt === count && index === count - 1) cls += " drop-after";
    return cls;
  }

  // While dragging, items at/after the insertion point slide down to reveal the
  // gap. The dragged item stays put (translucent).
  function itemStyle(index: number): React.CSSProperties | undefined {
    if (activeDropAt === null) return undefined;
    if (index === dragIndex) return undefined;
    if (index >= activeDropAt) return { transform: `translateY(${gapPx}px)` };
    return undefined;
  }

  if (count === 0) {
    return (
      <div
        className={`sequence-empty${dropAt !== null ? " drop-active" : ""}`}
        onDragOver={(e) => {
          if (!allowsDrop(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropAt(0);
        }}
        onDragLeave={() => setDropAt(null)}
        onDrop={onContainerDrop}
      >
        {emptyHint}
      </div>
    );
  }

  return (
    <ol
      ref={listRef}
      className="sequence-list"
      style={activeDropAt !== null ? { paddingBottom: gapPx } : undefined}
      onDragOver={onContainerDragOver}
      onDrop={onContainerDrop}
      onDragLeave={onContainerDragLeave}
    >
      {itemIds.map((actionId, index) => (
        <li
          key={`${actionId}-${index}`}
          className={itemClassName(index)}
          style={itemStyle(index)}
          draggable={!readOnly}
          onDragStart={(e) => {
            if (readOnly) return;
            e.dataTransfer.setData(DND_SEQ_INDEX, String(index));
            e.dataTransfer.setData("text/plain", getText(actionId));
            e.dataTransfer.effectAllowed = "move";
            setGapPx(e.currentTarget.offsetHeight + 6);
            setDragIndex(index);
          }}
          onDragEnd={clearDrag}
        >
          {!readOnly && (
            <span className="drag-handle" aria-hidden="true">
              ⠿
            </span>
          )}
          <span className="step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="item-text">
            <span className="visually-hidden">Step {index + 1}: </span>
            {getText(actionId)}
          </span>
          {!readOnly && (
            <span className="item-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move step ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                ↑<span className="btn-label"> Up</span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move step ${index + 1} down`}
                disabled={index === count - 1}
                onClick={() => onMove(index, 1)}
              >
                ↓<span className="btn-label"> Down</span>
              </button>
              <button
                type="button"
                className="danger"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
