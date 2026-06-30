// Stable ID generation. Uses crypto.randomUUID() per spec §14, with a
// defensive fallback for very old environments.
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
