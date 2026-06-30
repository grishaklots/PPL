// Shared drag-and-drop helpers (native HTML5 DnD, no dependencies).

// Custom dataTransfer MIME types. Browsers lower-case type names; reading them
// back with the same constant works because these are already lower-case.
export const DND_ACTION_ID = "application/x-ppl-action-id";
export const DND_SEQ_INDEX = "application/x-ppl-seq-index";

/**
 * Move the item at `from` so that it is inserted at position `insertAt`
 * (an index in the range [0, list.length], interpreted against the original
 * list with the dragged item still in place).
 */
export function reorderList<T>(list: T[], from: number, insertAt: number): T[] {
  const copy = list.slice();
  const [moved] = copy.splice(from, 1);
  const adjusted = insertAt > from ? insertAt - 1 : insertAt;
  copy.splice(adjusted, 0, moved);
  return copy;
}

/** True if the drag carries an action id (dragged from an action bag). */
export function dragHasActionId(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(DND_ACTION_ID);
}

/** True if the drag carries a sequence index (reordering within a sequence). */
export function dragHasSeqIndex(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(DND_SEQ_INDEX);
}

/**
 * Given a pointer Y (in the list's content coordinates) and the layout boxes of
 * the items, return the insertion index in [0, boxes.length]. The pointer maps
 * to "before item i" when it is above item i's vertical midpoint, so dropping
 * anywhere over the list — including gaps and the area past the last item —
 * resolves to a sensible position.
 */
export function insertionIndex(
  pointerY: number,
  boxes: { top: number; height: number }[],
): number {
  for (let i = 0; i < boxes.length; i++) {
    const mid = boxes[i].top + boxes[i].height / 2;
    if (pointerY < mid) return i;
  }
  return boxes.length;
}
