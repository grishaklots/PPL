// Group actions by their category for display. Category + value actions are
// grouped under their category; plain-text actions are collected into a single
// trailing "ungrouped" group (category === null). Within each group, and across
// category headers, ordering is alphabetical.

import type { Action } from "./types";

export type ActionGroup = {
  key: string;
  category: string | null; // null = ungrouped / "Other" (plain-text actions)
  actions: Action[];
};

export function groupActionsByCategory(actions: Action[]): ActionGroup[] {
  const byCategory = new Map<string, Action[]>();
  const ungrouped: Action[] = [];

  for (const action of actions) {
    if (action.category && action.value) {
      const existing = byCategory.get(action.category);
      if (existing) existing.push(action);
      else byCategory.set(action.category, [action]);
    } else {
      ungrouped.push(action);
    }
  }

  const groups: ActionGroup[] = [];
  const categories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b, "he"));
  for (const category of categories) {
    const list = byCategory
      .get(category)!
      .slice()
      .sort((a, b) => a.text.localeCompare(b.text, "he"));
    groups.push({ key: `cat:${category}`, category, actions: list });
  }

  if (ungrouped.length > 0) {
    ungrouped.sort((a, b) => a.text.localeCompare(b.text, "he"));
    groups.push({ key: "__ungrouped__", category: null, actions: ungrouped });
  }

  return groups;
}
