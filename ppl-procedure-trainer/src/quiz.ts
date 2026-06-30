// Quiz navigation helpers (pure, testable).

/**
 * Index of the next procedure (scanning downward from `fromIndex`, wrapping
 * around to the top) whose id is not in `answered`, skipping `excludeId`.
 * Returns null when every other procedure is already answered.
 *
 * This drives top-to-bottom progression through a shuffled order, and the
 * "skip and return later" behaviour: a skipped procedure stays unanswered, so
 * it is picked up again after all the others.
 */
export function nextUnansweredIndex(
  order: string[],
  answered: Set<string>,
  fromIndex: number,
  excludeId: string | null,
): number | null {
  const n = order.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    const id = order[idx];
    if (id === excludeId) continue;
    if (!answered.has(id)) return idx;
  }
  return null;
}
