// Syncs the repo-root source-of-truth data file into the app's src/ so Vite can
// bundle it. Run automatically before `dev` and `build` (npm pre-hooks).
//
// Source of truth: <repo-root>/ppl-procedures.json
// Bundled copy:    ppl-procedure-trainer/src/ppl-procedures.json (generated)
import { existsSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../ppl-procedure-trainer/scripts
const appRoot = resolve(here, "..");
const source = resolve(appRoot, "..", "ppl-procedures.json"); // repo root
const dest = resolve(appRoot, "src", "ppl-procedures.json");

if (existsSync(source)) {
  copyFileSync(source, dest);
  console.log(`[sync-data] copied ${source} -> ${dest}`);
} else if (!existsSync(dest)) {
  const empty = { version: 1, actions: [], procedures: [] };
  writeFileSync(dest, JSON.stringify(empty, null, 2) + "\n");
  console.log(`[sync-data] no root ppl-procedures.json found; wrote empty ${dest}`);
} else {
  console.log(`[sync-data] no root ppl-procedures.json found; keeping existing ${dest}`);
}
