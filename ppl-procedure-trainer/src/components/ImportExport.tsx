import { useRef, useState } from "react";
import { useApp } from "../appContext";
import { clearStoredData, downloadJson, downloadSeed, parseImport } from "../storage";

export function ImportExport() {
  const { state, replaceData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { actions, procedures } = state.data;

  function handleExport() {
    setError(null);
    setSuccess(null);
    downloadJson(state.data);
  }

  function handleDownloadSeed() {
    setError(null);
    setSuccess(null);
    downloadSeed(state.data);
  }

  function handleReset() {
    const proceed = window.confirm(
      "Discard your in-app edits and reload the published ppl-procedures.json?\n\n" +
        "Anything you have not exported will be lost.",
    );
    if (!proceed) return;
    clearStoredData();
    window.location.reload();
  }

  function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const file = event.target.files?.[0];
    // Allow re-importing the same file twice in a row.
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseImport(text);
      if (!result.ok) {
        setError(`Import failed: ${result.error}`);
        return;
      }
      const proceed = window.confirm(
        `Import ${result.data.actions.length} action(s) and ${result.data.procedures.length} procedure(s)?\n\n` +
          `This will REPLACE all current data (${actions.length} action(s), ${procedures.length} procedure(s)).`,
      );
      if (!proceed) return;
      replaceData(result.data);
      setSuccess(
        `Imported ${result.data.actions.length} action(s) and ${result.data.procedures.length} procedure(s).`,
      );
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsText(file);
  }

  return (
    <section className="panel io-panel" aria-labelledby="io-heading">
      <h2 id="io-heading">Import / Export</h2>
      <p className="hint">
        The app always loads from the bundled <code>ppl-procedures.json</code> (the only source of
        truth). Edits you make here live in this tab only — <strong>export a JSON</strong> and
        commit it to the repo to persist them. Import loads a JSON into the current session.
      </p>

      <p>
        Current data: <strong>{actions.length}</strong> action(s),{" "}
        <strong>{procedures.length}</strong> procedure(s).
      </p>

      <div className="io-buttons">
        <button type="button" onClick={handleExport}>
          Export JSON
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleFileChosen}
        />
      </div>

      <hr className="io-divider" />

      <h3>Publishing</h3>
      <p className="hint">
        The published app's procedures come from the repo-root <code>ppl-procedures.json</code>. To
        update them, download the file below, replace <code>ppl-procedures.json</code> in the repo,
        then redeploy. Use "Reload published data" to discard in-tab edits and reload the file.
      </p>
      <div className="io-buttons">
        <button type="button" onClick={handleDownloadSeed}>
          Download as ppl-procedures.json
        </button>
        <button type="button" className="danger" onClick={handleReset}>
          Reload published data
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}
    </section>
  );
}
