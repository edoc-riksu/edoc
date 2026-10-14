"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";

// By default @monaco-editor/react fetches Monaco from a CDN at runtime —
// one blocked request (a firewall, an ad blocker, antivirus, no internet)
// and the whole editor fails to initialize with an opaque error. Point it
// at the copy scripts/copy-monaco.js already placed in public/ instead,
// so it always loads from this app's own origin.
loader.config({ paths: { vs: "/monaco-editor/vs" } });

// Monaco touches browser-only APIs (web workers, the DOM) at import time,
// so it can't run during Next.js's server render — load it client-side only.
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });

/**
 * The code console's editor — Monaco (the engine behind VS Code and
 * LeetCode's own editor) in place of a plain textarea: real syntax
 * highlighting, line numbers, bracket matching and auto-indent for
 * whatever `language` is passed. Reports plain text back through
 * `onChange` — grading reads that exact string, same as any plain text
 * input would.
 */
export default function CodeEditor({ language = "python", value, onChange, onRunShortcut, disabled, className = "" }) {
  const onRunShortcutRef = useRef(onRunShortcut);
  onRunShortcutRef.current = onRunShortcut;

  const handleMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunShortcutRef.current?.());
  };

  return (
    <div className={`ui-code-editor ${className}`}>
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
          tabSize: 4,
          wordWrap: "on",
          padding: { top: 12 },
          renderLineHighlight: disabled ? "none" : "line",
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
        }}
        loading={<div className="ui-code-editor-loading">Loading editor…</div>}
      />
    </div>
  );
}
