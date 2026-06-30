# Spec: PPL Procedures Memorization Web App

## Goal

Build a simple client-side web app that helps a PPL student memorize standard and emergency procedures.

The app has two main modes:

1. **Design Mode** — create and edit procedures and actions.
2. **Learn Mode** — practice recalling the correct ordered sequence of actions for a randomly selected procedure.

The app must fully support Hebrew text and RTL layout.

---

# 1. Core Concepts

## Action

An **action** is a reusable step that can appear in one or more procedures.

Examples:

- "סגור מצערת"
- "חימום קרבורטור - פתוח"
- "מהירות גלישה 65 KIAS"
- "בחר שדה לנחיתה"

Action names are free text and may be written in Hebrew.

Each action should have:

```ts
type Action = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## Procedure

A **procedure** is an ordered sequence of actions.

Examples:

- "שריפת מנוע באוויר"
- "נחיתת אונס"
- "היחלצות מסחרור"
- "אובדן קשר"

Each procedure should have:

```ts
type Procedure = {
  id: string;
  name: string;
  actionIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

The order of `actionIds` is critical.

---

## App Data

All data should be stored as a single JSON structure:

```ts
type AppData = {
  version: number;
  actions: Action[];
  procedures: Procedure[];
};
```

Example:

```json
{
  "version": 1,
  "actions": [
    {
      "id": "act_001",
      "text": "סגור מצערת",
      "createdAt": "2026-06-29T20:00:00.000Z",
      "updatedAt": "2026-06-29T20:00:00.000Z"
    }
  ],
  "procedures": [
    {
      "id": "proc_001",
      "name": "נחיתת אונס",
      "actionIds": ["act_001"],
      "createdAt": "2026-06-29T20:00:00.000Z",
      "updatedAt": "2026-06-29T20:00:00.000Z"
    }
  ]
}
```

---

# 2. Storage Requirements

The app should be fully client-side. No backend is required.

Use browser local storage for automatic persistence, but also provide JSON import/export.

## Required storage behavior

- Save all changes automatically to `localStorage`.
- Provide an **Export JSON** button that downloads the full app data as a `.json` file.
- Provide an **Import JSON** button that allows the user to upload a previously exported JSON file.
- Imported JSON should replace the current local data after confirmation.
- Validate imported JSON before accepting it.
- Show a clear error if the JSON is invalid or missing required fields.

Important: Browsers cannot always silently write directly to arbitrary local files. Therefore, “stored locally as a JSON file” should be implemented as export/download + import/upload, with localStorage used for autosave.

---

# 3. RTL / Hebrew Requirements

The UI must support Hebrew procedure names and action text.

## Required RTL behavior

- Set the main app container to:

```html
<div dir="rtl" lang="he"></div>
```

- Text inputs should support Hebrew naturally.
- Lists, cards, buttons, and drag/drop behavior should work correctly in RTL.
- Use right-aligned text by default.
- Avoid layouts that assume left-to-right ordering.
- Numeric values like scores can remain readable in normal numeric format.
- The app chrome may be English or Hebrew, but all user-created content must display correctly in Hebrew.

Preferred UI labels can be English for development simplicity, but the app should be easy to localize.

---

# 4. Design Mode

Design Mode allows the user to manage the knowledge base.

## 4.1 Action Management

The user must be able to:

- View all available actions.
- Add a new action using free text.
- Edit an existing action.
- Delete an action.
- Search/filter actions by text.
- See whether an action is used by any procedures.

## Delete behavior

When deleting an action:

- If the action is not used by any procedure, delete immediately after confirmation.
- If the action is used by procedures, show a warning listing the affected procedures.
- If confirmed, remove the action from the global action list and from all procedure sequences.

---

## 4.2 Procedure Management

The user must be able to:

- View all procedures.
- Create a new procedure.
- Rename a procedure.
- Delete a procedure.
- Edit a procedure’s action sequence.

A procedure must have:

- A non-empty name.
- Zero or more assigned actions.
- An ordered list of actions.

---

## 4.3 Procedure Editor

When editing a procedure, show two areas:

### Available Actions Bag

This contains all actions in the system.

The user can:

- Search/filter available actions.
- Add an action from the bag into the current procedure.
- Create a new action directly from the procedure editor.
- Add the newly created action to the global action list.
- Optionally add the newly created action immediately to the current procedure.

### Procedure Sequence

This contains the selected actions for the current procedure, in order.

The user can:

- Reorder actions.
- Remove an action from the procedure sequence without deleting it globally.
- Add the same action more than once only if explicitly allowed.

Default behavior: prevent duplicate actions inside the same procedure unless the user confirms.

---

## 4.4 Ordering

The order of actions must be easy to control.

Acceptable implementation options:

- Drag and drop.
- Up/down buttons.
- Both.

For simplicity and accessibility, implement up/down buttons even if drag and drop is also implemented.

Each action in a procedure sequence should show:

- The step number.
- The action text.
- Move up button.
- Move down button.
- Remove button.

---

# 5. Learn Mode

Learn Mode tests the student.

## 5.1 Starting a Session

When entering Learn Mode:

- Select a random procedure from all saved procedures.
- The procedure name is shown to the user.
- The correct action sequence is hidden.
- The user sees a bag containing all available actions.
- The user must build the correct ordered sequence.

Do not select procedures that have zero actions.

If no valid procedures exist, show a message asking the user to create procedures in Design Mode first.

---

## 5.2 Practice Interaction

The user should see:

- Procedure name.
- Available actions bag.
- Current answer sequence.
- Submit button.
- Clear answer button.
- Optional “New random procedure” button.

The user can:

- Select actions from the bag.
- Add them to their answer sequence.
- Reorder selected actions.
- Remove selected actions.
- Submit the answer.

The answer sequence must be compared against the correct `actionIds` array.

---

## 5.3 Answer Checking

On submit, compare the selected action IDs to the procedure’s correct action IDs.

The answer is correct only if:

- Same number of actions.
- Same action IDs.
- Same order.

Show feedback:

- Correct / incorrect.
- Score summary.
- For incorrect answers, show a comparison between:
  - Student answer.
  - Correct answer.

In the comparison view:

- Highlight missing actions.
- Highlight extra actions.
- Highlight actions that are correct but in the wrong position.
- Highlight fully correct positions.

Keep the comparison simple and clear.

---

## 5.4 Post-Answer Options

After submitting, show:

- Try again.
- Show correct answer.
- Next random procedure.

If the user clicks “Try again”:

- Keep the same procedure.
- Clear the current answer.
- Hide the correct answer again.

If the user clicks “Next random procedure”:

- Pick a new random valid procedure.
- Avoid repeating the same procedure immediately if possible.

---

# 6. Scoring

Maintain lightweight session stats in memory during Learn Mode.

Track:

```ts
type LearnSessionStats = {
  attempted: number;
  correct: number;
  incorrect: number;
};
```

Show:

- Number attempted.
- Number correct.
- Number incorrect.
- Accuracy percentage.

Stats do not need to persist across browser reloads for v1.

---

# 7. UI Structure

## Main Navigation

The app should have a simple top-level navigation:

- Design Mode
- Learn Mode
- Import / Export

A single-page app is preferred.

---

## Suggested Layout

### Design Mode

Left or top section:

- Procedure list
- Add procedure button

Main section:

- Selected procedure editor
- Procedure name input
- Ordered action sequence
- Available actions bag
- Add new action input

Separate section:

- Global action management

---

### Learn Mode

Main card:

- Procedure name
- Available actions
- Student answer sequence
- Submit / clear / next buttons

Feedback area:

- Result
- Comparison
- Correct answer reveal

---

# 8. Validation Rules

## Action validation

- Action text cannot be empty.
- Trim whitespace.
- Prevent exact duplicate action text by default.
- Allow editing action text.
- Updating an action should update its display everywhere because procedures reference actions by ID.

## Procedure validation

- Procedure name cannot be empty.
- Trim whitespace.
- Prevent exact duplicate procedure names by default.
- Procedure may be saved with zero actions, but it should not appear in Learn Mode until it has at least one action.

## Import validation

Imported JSON must include:

- `version`
- `actions`
- `procedures`

Each action must include:

- `id`
- `text`

Each procedure must include:

- `id`
- `name`
- `actionIds`

Ignore unknown fields.

Reject procedures that reference action IDs that do not exist, or show a repair option that removes missing action IDs.

For v1, rejecting invalid imports is acceptable.

---

# 9. Accessibility

The app should be usable without drag and drop.

Required:

- Buttons for moving actions up/down.
- Clear focus states.
- Keyboard-friendly inputs and buttons.
- Semantic HTML where practical.
- No reliance on color alone for correctness feedback.
- Use icons only with text labels or accessible labels.

---

# 10. Suggested Tech Stack

Use a simple modern frontend stack.

Recommended:

- React
- TypeScript
- Vite
- LocalStorage
- Plain CSS or lightweight CSS modules

No backend.

No authentication.

No database.

No server-side persistence.

---

# 11. Non-Goals for v1

Do not implement these unless explicitly requested later:

- User accounts.
- Cloud sync.
- Backend database.
- Spaced repetition algorithm.
- Mobile app packaging.
- Audio recording.
- Voice recognition.
- Multi-aircraft profiles.
- Built-in aviation procedure content.
- AI-generated procedures.
- Certification or official flight school compliance.

The app is only a memorization aid. It should not claim to replace official aircraft POH, instructor guidance, checklist usage, or aviation regulations.

---

# 12. Nice-to-Have Features

These are optional if the implementation is simple:

- Duplicate procedure button.
- Procedure categories, for example:
  - Normal
  - Emergency
  - Abnormal
- Search procedures.
- Shuffle available actions in Learn Mode.
- “Hard mode” where available actions are shown without numbering.
- “Reveal one step” hint.
- Export filename includes date, for example:

```txt
ppl-procedures-2026-06-29.json
```

---

# 13. Acceptance Criteria

The app is complete when:

1. The user can create actions in Hebrew.
2. The user can create procedures in Hebrew.
3. The user can assign actions to procedures in a specific order.
4. The user can reorder procedure actions.
5. The user can save data automatically in the browser.
6. The user can export all data to JSON.
7. The user can import previously exported JSON.
8. Learn Mode randomly selects a procedure with at least one action.
9. Learn Mode lets the user build an ordered sequence from all available actions.
10. The app correctly checks whether the selected sequence exactly matches the procedure sequence.
11. The app gives clear feedback after submission.
12. RTL Hebrew text displays correctly throughout the app.
13. The app works without a backend.

---

# 14. Implementation Notes

Use stable IDs instead of relying on action text, because action text may be edited later.

Use this helper shape for app state:

```ts
type AppState = {
  data: AppData;
  mode: "design" | "learn";
  selectedProcedureId?: string;
};
```

Suggested localStorage key:

```ts
const STORAGE_KEY = "ppl-procedure-trainer-v1";
```

Suggested ID generation:

```ts
const id = crypto.randomUUID();
```

When exporting JSON, use:

```ts
JSON.stringify(appData, null, 2)
```

When importing JSON:

1. Parse JSON.
2. Validate structure.
3. Confirm replacement.
4. Save to localStorage.
5. Refresh UI state.

---

# 15. First Version Priority

Build in this order:

1. Data model and localStorage persistence.
2. Action CRUD.
3. Procedure CRUD.
4. Procedure editor with ordered actions.
5. JSON export/import.
6. Learn Mode.
7. Feedback comparison.
8. RTL polish and accessibility.
