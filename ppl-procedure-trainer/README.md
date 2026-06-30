# PPL Procedure Trainer

A fully client-side web app that helps a PPL student memorize standard and
emergency flight procedures. It supports Hebrew text and right-to-left (RTL)
layout for all user-created content.

> This is a memorization aid only. It does **not** replace the official
> aircraft POH, instructor guidance, checklist usage, or aviation regulations.

## Features

- **Design Mode** (behind a password gate) — manage the knowledge base:
  - Global **actions** (reusable steps), shown **grouped by category**. Each
    action is either **plain text** (e.g. "Use Extinguisher") or a **category +
    value** pair (e.g. category "Speed" / value "60KIAS", or "Mixture" / "Lean").
    Add, edit, delete, search, and see how many procedures use each action.
    Deleting an in-use action warns you and removes it from every procedure.
  - **Procedures** (ordered sequences of actions): create, rename, duplicate,
    delete, and search.
  - **Procedure editor** with an available-actions bag (grouped by category,
    search, and create new action inline) and an ordered sequence with step
    numbers. Reorder by **drag and drop** or with up/down buttons; drag actions
    from the bag straight into the sequence; remove buttons. Duplicate steps
    require confirmation.
- **Learn Mode** (open, no login) — a scored quiz that **starts automatically**:
  - On entry it shuffles **all** valid procedures into a random order and begins;
    the **scenarios sidebar** lists them in that order and you progress
    top-to-bottom. Click any scenario to jump to it, or **Start Quiz** to
    reshuffle and restart.
  - For each procedure, available actions are **grouped by category** (one
    section per category, plus an "Other" section for plain-text actions); build
    the ordered answer by dragging actions in or using the Add button, and
    reorder by drag and drop or up/down buttons.
  - **Skip by navigating**: click any other scenario in the sidebar to move on;
    your **in-progress answer is saved per procedure**, so returning to one
    restores what you had built (the sidebar marks started-but-unanswered
    procedures with a dot).
  - Submit to check; exact-match comparison (same actions, same order).
  - On submit, the feedback **replaces the input area** (so it is visible at the
    top without scrolling): clear colour-and-text feedback highlighting correct
    positions, wrong positions, extra and missing actions, plus an optional
    "show correct answer".
  - The sidebar marks each answered procedure ✓/✗; when all are answered a
    **results screen** shows the final score and a per-procedure breakdown, with
    "Restart quiz". The layout (sidebar + capped, internally-scrolling panels)
    aims to fit a standard screen without page scrolling.
- **Import / Export** (behind the password gate) — JSON export (dated filename,
  e.g. `ppl-procedures-2026-06-29.json`) and validated import that replaces the
  current session's data after confirmation. The app always loads from the
  bundled file (below); edits are in-memory until exported.

## Authoring password gate

Design Mode and Import/Export are gated behind a password (Learn Mode is open).
This is a **cosmetic gate only, not real security** — the app is fully
client-side, so the password ships in the public JS bundle and can be bypassed
via dev tools; it only discourages casual edits.

- Default password: `ppl-design`.
- Override at build time with an env var (e.g. a `.env` file):
  `VITE_DESIGN_PASSWORD=my-secret`.
- The unlocked state is remembered per browser tab (sessionStorage) and can be
  cleared with the "Lock authoring" button.

## Publishing your procedures (source of truth)

The published app's content comes from a single JSON file kept at the **repo
root**: `ppl-procedures.json`. It is the **source of truth**. A small script
(`scripts/sync-data.mjs`, run automatically before `dev` and `build`) copies it
into `src/ppl-procedures.json` so Vite can bundle it; that generated copy is
git-ignored, so you only ever edit/commit the root file.

How content/data works:

- The app **always** loads its data from the bundled `ppl-procedures.json` — it
  is the only source of truth. Every visitor sees your procedures, with no login.
- There is **no** `localStorage` persistence of the data: edits made in the app
  live in memory for that browser tab/session only. A reload reloads the file.
- Each visitor's Learn-Mode practice **progress is their own** (in-memory for the
  session).

To update the published procedures:

1. Unlock and edit in **Design Mode** (changes are in-memory for the session).
2. Go to **Import / Export → Publishing** and click **Download as
   ppl-procedures.json**.
3. Replace the repo-root `ppl-procedures.json` with that file.
4. Commit and redeploy (see below).

"Reset to published data" (Import / Export) clears this browser's local changes
and reloads the bundled data — handy on your own machine after updating the file.

## Deploying (free, no backend)

This is a static SPA, so any static host works on its free tier. Build command
`npm run build`, output directory `dist` (set the project root to the
`ppl-procedure-trainer` folder if your repo has this app in a subfolder):

- **Vercel** — easiest: "Add New Project", import the repo, set Root Directory
  to `ppl-procedure-trainer`, framework preset **Vite**. No base-path config
  needed (served at the domain root).
- **Cloudflare Pages** / **Netlify** — same idea: build `npm run build`, output
  `dist`.
- **GitHub Pages** — a ready workflow is included at
  `.github/workflows/deploy.yml`. Push to `main`, then in the repo set
  **Settings → Pages → Source = GitHub Actions**. It builds with
  `BASE_PATH=/<repo>/` so assets resolve under
  `https://<user>.github.io/<repo>/`. (The base path is configurable via the
  `BASE_PATH` env var, defaulting to `/`.)

Note: be sure the repo-root `ppl-procedures.json` is committed — the deployed
app's content comes from it. The app does not persist data in the browser;
each visitor's in-app edits and Learn-Mode progress are in-memory for the
session only.

## Data model

```ts
type Action = {
  id: string;
  text: string;        // display text; for category+value actions this is "category - value"
  category?: string;   // present only for category + value actions
  value?: string;      // present only for category + value actions
  createdAt: string;
  updatedAt: string;
};
type Procedure = { id: string; name: string; actionIds: string[]; createdAt: string; updatedAt: string };
type AppData = { version: number; actions: Action[]; procedures: Procedure[] };
```

The app always loads its data from the bundled `ppl-procedures.json` (the only
source of truth). Edits are in-memory for the session; export a new JSON to
persist them. A leftover `localStorage` key (`ppl-procedure-trainer-v1`) from
older versions is cleared on load.

## Getting started

```bash
npm install
npm run dev      # start the dev server (Vite)
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build
npm run lint     # run oxlint
```

Then open the printed local URL (default http://localhost:5173).

## Tech stack

React + TypeScript + Vite, plain CSS. Data is bundled from a JSON file (no
persistence layer). No backend, authentication, or database.

## Project structure

```
src/
  types.ts            # data model
  ids.ts              # stable ID generation (crypto.randomUUID)
  storage.ts          # load from bundled JSON + import/export + validation
  compare.ts          # Learn Mode answer checking & comparison
  quiz.ts             # quiz navigation (next-unanswered / skip-and-return)
  config.ts           # authoring password gate config (cosmetic)
  ppl-procedures.json # bundled content (generated from repo-root file)
  dnd.ts              # drag-and-drop helpers (data types + reorderList)
  actionGroups.ts     # group actions by category for display
  appContext.ts       # React context + useApp hook
  appState.tsx        # reducer + AppProvider (validation, autosave)
  App.tsx             # shell + navigation + authoring gate (RTL container)
  components/
    DesignMode.tsx
    DesignGate.tsx        # password prompt for authoring areas
    ProcedureList.tsx
    ProcedureEditor.tsx
    ActionManager.tsx
    ActionForm.tsx        # add/edit form: plain text OR category + value
    ActionBag.tsx         # grouped, draggable pool of available actions
    DraggableSequence.tsx # ordered list: drag-reorder + up/down + remove
    LearnMode.tsx         # finite, scored quiz over all valid procedures
    ImportExport.tsx
  index.css           # global + RTL styles
```
