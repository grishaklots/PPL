import { useState } from "react";
import { DESIGN_PASSWORD } from "../config";

type Props = {
  title: string;
  onUnlock: () => void;
};

/**
 * Password prompt that protects the authoring areas (Design / Import-Export).
 * This is a cosmetic gate only — see config.ts.
 */
export function DesignGate({ title, onUnlock }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (password === DESIGN_PASSWORD) {
      onUnlock();
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <section className="panel gate" aria-labelledby="gate-heading">
      <h2 id="gate-heading">🔒 {title} is locked</h2>
      <p className="hint">Enter the authoring password to continue.</p>
      <div className="field-row">
        <label className="visually-hidden" htmlFor="gate-password">
          Authoring password
        </label>
        <input
          id="gate-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button type="button" onClick={submit}>
          Unlock
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
