// Lightweight "authoring" gate configuration.
//
// NOTE: This is a cosmetic gate, NOT real security. The app is fully
// client-side, so the password ships inside the public JS bundle and anyone can
// read it or bypass the gate via dev tools. It only discourages casual edits to
// the locally-stored data. Do not rely on it to protect anything sensitive.
//
// Override the password at build time with an env var, e.g. in a `.env` file:
//   VITE_DESIGN_PASSWORD=my-secret
const envPassword = (import.meta.env.VITE_DESIGN_PASSWORD as string | undefined) ?? "";

export const DESIGN_PASSWORD = envPassword.trim() !== "" ? envPassword.trim() : "ppl-design";

// Key under which the per-tab "unlocked" flag is stored (sessionStorage).
export const DESIGN_UNLOCK_KEY = "ppl-design-unlocked-v1";
