"use client";
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";

// By default @monaco-editor/react fetches Monaco from a CDN at runtime —
// one blocked request (a firewall, an ad blocker, antivirus, no internet)
// and the whole editor fails to initialize with an opaque error. Point it
// at the copy scripts/copy-monaco.js already placed in public/ instead,
// so it always loads from this app's own origin.
loader.config({ paths: { vs: "/monaco-editor/vs" } });

// Monaco touches browser-only APIs (web workers, the DOM) at import time,
// so it can't run during Next.js's server render — load it client-side
// only, same as any editor component of this kind.
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });

const LANGUAGE_MAP = {
  "Python Engine Core": "python",
  "JavaScript Engine": "javascript",
  "TypeScript Array": "typescript",
  "Go Engine Subsystem": "go",
  "Rust Core Defense": "rust",
  "SQL Relational Matrix": "sql"
};

/**
 * 💻 CODE EDITOR — Monaco (the engine behind VS Code, and what LeetCode
 * and HackerRank both run) in place of the old plain `<textarea>`: real
 * per-language syntax highlighting, line numbers, bracket matching and
 * auto-indent. It only ever reports plain text back through `onChange` —
 * grading, hints and everything else in CodeTerminal reads that exact
 * same string exactly as it did from the textarea before. This changes
 * how code is typed, never what counts as a correct submission.
 */
export default function CodeEditor({ sectorId, value, onChange, disabled, placeholder, blockPaste }) {
  const blockPasteRef = useRef(blockPaste);
  blockPasteRef.current = blockPaste;

  const language = LANGUAGE_MAP[sectorId] || "plaintext";

  // Proctored lockdown: block paste at the DOM level, in the capture
  // phase — before Monaco's own internal textarea handles it — so the
  // same "no pasting" rule the old textarea's onPaste enforced still
  // holds. Read from a ref so this listener (registered once, on mount)
  // always sees the current proctored state without re-registering.
  const handleMount = (editor) => {
    const domNode = editor.getDomNode();
    domNode?.addEventListener(
      "paste",
      (e) => {
        if (blockPasteRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  };

  return (
    <div className="relative flex-1 min-h-0">
      {!value && placeholder && (
        <div className="absolute inset-0 p-4 pointer-events-none text-xs text-slate-700 font-mono leading-relaxed z-10 whitespace-pre-wrap">
          {placeholder}
        </div>
      )}
      <MonacoEditor
        height="100%"
        width="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          readOnly: disabled,
          domReadOnly: disabled,
          minimap: { enabled: false },
          fontSize: 13,
          fontLigatures: false,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 12 },
          renderLineHighlight: disabled ? "none" : "line",
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
        }}
        loading={<div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono bg-[#1e1e1e]">Loading editor…</div>}
      />
    </div>
  );
}
