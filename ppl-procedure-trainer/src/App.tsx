import { useState } from "react";
import { useApp } from "./appContext";
import { DesignMode } from "./components/DesignMode";
import { LearnMode } from "./components/LearnMode";
import { ImportExport } from "./components/ImportExport";
import { DesignGate } from "./components/DesignGate";
import { DESIGN_UNLOCK_KEY } from "./config";

type View = "design" | "learn" | "io";

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(DESIGN_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export default function App() {
  const { setMode } = useApp();
  const [view, setView] = useState<View>("learn");
  const [unlocked, setUnlocked] = useState<boolean>(readUnlocked);

  function go(next: View) {
    setView(next);
    if (next === "design" || next === "learn") {
      setMode(next);
    }
  }

  function unlock() {
    setUnlocked(true);
    try {
      sessionStorage.setItem(DESIGN_UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function lock() {
    setUnlocked(false);
    try {
      sessionStorage.removeItem(DESIGN_UNLOCK_KEY);
    } catch {
      /* ignore */
    }
  }

  // Design and Import/Export are authoring tools and sit behind the gate.
  const isAuthoring = view === "design" || view === "io";

  function renderView() {
    if (isAuthoring && !unlocked) {
      return (
        <DesignGate
          title={view === "design" ? "Design Mode" : "Import / Export"}
          onUnlock={unlock}
        />
      );
    }
    if (view === "design") return <DesignMode />;
    if (view === "io") return <ImportExport />;
    return <LearnMode />;
  }

  return (
    <div className="app" dir="rtl" lang="he">
      <header className="app-header">
        <div className="header-titles">
          <h1>PPL Procedure Trainer</h1>
          <p className="subtitle">
            מתרגל נהלים — Memorize standard &amp; emergency procedures
          </p>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={view === "learn" ? "nav-active" : ""}
            aria-current={view === "learn" ? "page" : undefined}
            onClick={() => go("learn")}
          >
            Learn Mode
          </button>
          <button
            type="button"
            className={view === "design" ? "nav-active" : ""}
            aria-current={view === "design" ? "page" : undefined}
            onClick={() => go("design")}
          >
            Design Mode{!unlocked && <span aria-hidden="true"> 🔒</span>}
          </button>
          <button
            type="button"
            className={view === "io" ? "nav-active" : ""}
            aria-current={view === "io" ? "page" : undefined}
            onClick={() => go("io")}
          >
            Import / Export{!unlocked && <span aria-hidden="true"> 🔒</span>}
          </button>
          {unlocked && (
            <button type="button" className="ghost" onClick={lock}>
              Lock authoring
            </button>
          )}
        </nav>
      </header>

      <main className="app-body">{renderView()}</main>

      <footer className="app-footer">
        <p>
          A memorization aid only. It does not replace the official aircraft POH, instructor
          guidance, checklist usage, or aviation regulations.
        </p>
      </footer>
    </div>
  );
}
