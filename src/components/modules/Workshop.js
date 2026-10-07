"use client";
import React, { useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { ChevronLeft, Plus, X, FileCode, Save, Rocket, CheckCircle2 } from "lucide-react";

/**
 * 🛠️ WORKSHOP — a real multi-file code sandbox (Phase 04). Not a toy
 * single-textarea box: a title, file tabs with an inline add-file form
 * (no window.prompt/confirm — those block the whole page), a per-file
 * editor, and an explicit Save Draft / Publish split so a project can be
 * iterated on privately before it lands on the Shipyard board.
 *
 * `project` — an existing workshopProjects entry to keep editing, or null
 * to start fresh. `seed` — optional { title, files, sourceGuidedBuildId }
 * used only when `project` is null, e.g. unlocking a Guided Build.
 */
export default function Workshop({ project, seed, onBack }) {
  const { createWorkshopProject, saveWorkshopProject, publishWorkshopProject, pushToast, playSystemSound } = usePilot();

  const [projectId, setProjectId] = useState(project?.id || null);
  const [status, setStatus] = useState(project?.status || "draft");
  const [title, setTitle] = useState(project?.title || seed?.title || "Untitled Build");
  const [files, setFiles] = useState(
    project?.files?.length ? project.files : seed?.files?.length ? seed.files : [{ name: "main.txt", content: "" }]
  );
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [dirty, setDirty] = useState(false);

  const activeFile = files[Math.min(activeFileIdx, files.length - 1)];

  const updateFileContent = (idx, content) => {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, content } : f)));
    setDirty(true);
  };

  const commitNewFile = () => {
    const clean = newFileName.trim();
    if (!clean) {
      setAddingFile(false);
      return;
    }
    setFiles((prev) => [...prev, { name: clean, content: "" }]);
    setActiveFileIdx(files.length);
    setNewFileName("");
    setAddingFile(false);
    setDirty(true);
    playSystemSound("CLICK");
  };

  const removeFile = (idx) => {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setActiveFileIdx((i) => Math.max(0, i >= idx ? i - 1 : i));
    setDirty(true);
  };

  const ensureProjectId = () => {
    if (projectId) return projectId;
    const id = createWorkshopProject({ title, files, sourceGuidedBuildId: seed?.sourceGuidedBuildId || null });
    setProjectId(id);
    return id;
  };

  const handleSaveDraft = () => {
    const id = ensureProjectId();
    saveWorkshopProject(id, { title, files });
    setDirty(false);
    playSystemSound("CLICK");
    pushToast({ title: "Draft saved", body: `${title} — saved to your Workshop.`, tone: "info", voice: null });
  };

  const handlePublish = () => {
    const id = ensureProjectId();
    saveWorkshopProject(id, { title, files });
    publishWorkshopProject(id);
    setStatus("published");
    setDirty(false);
  };

  return (
    <div className="flex flex-col h-full gap-3 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 font-scope text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer w-fit"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Shipyard
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-xs border ${
              status === "published" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400" : "border-slate-800 bg-slate-900/40 text-slate-500"
            }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
          {dirty && <span className="text-[9px] text-amber-400 font-scope font-bold uppercase tracking-wide">Unsaved changes</span>}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        placeholder="Project title"
        className="scope-frame scope-frame-sm bg-slate-950/60 border border-slate-900 px-3 py-2 font-scope text-sm font-semibold text-slate-100 tracking-wide outline-hidden focus:border-cyan-500/50 placeholder-slate-700"
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-[280px]">
        {/* FILE RAIL */}
        <div className="scope-frame scope-frame-sm w-full lg:w-48 shrink-0 bg-slate-950/50 border border-slate-900 p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto">
          {files.map((f, idx) => (
            <div
              key={`${f.name}_${idx}`}
              className={`group flex items-center gap-1.5 pl-2 pr-1 py-1.5 shrink-0 lg:shrink cursor-pointer border transition-colors ${
                idx === activeFileIdx ? "border-cyan-500/40 bg-cyan-950/25 text-cyan-300" : "border-transparent text-slate-400 hover:bg-slate-900/50"
              }`}
              onClick={() => setActiveFileIdx(idx)}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              <span className="text-[10px] font-mono truncate max-w-[100px]">{f.name}</span>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-opacity cursor-pointer shrink-0"
                  aria-label={`Remove ${f.name}`}
                  title={`Remove ${f.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {addingFile ? (
            <div className="flex items-center gap-1 p-1 shrink-0">
              <input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewFile();
                  if (e.key === "Escape") {
                    setAddingFile(false);
                    setNewFileName("");
                  }
                }}
                placeholder="file.ext"
                className="w-24 bg-slate-900 border border-slate-800 px-1.5 py-1 text-[10px] font-mono text-slate-200 outline-hidden focus:border-cyan-500/50"
              />
              <button onClick={commitNewFile} className="text-emerald-400 hover:text-emerald-300 cursor-pointer shrink-0" aria-label="Confirm new file">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingFile(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 shrink-0 text-[10px] font-scope font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-400 border border-dashed border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> File
            </button>
          )}
        </div>

        {/* EDITOR */}
        <div className="scope-frame scope-frame-lg flex-1 bg-slate-950/70 border border-slate-900 flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-900/50 border-b border-slate-900 font-scope text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
            {activeFile?.name || "—"}
          </div>
          <textarea
            value={activeFile?.content || ""}
            onChange={(e) => updateFileContent(Math.min(activeFileIdx, files.length - 1), e.target.value)}
            spellCheck={false}
            placeholder="// Start building..."
            className="flex-1 w-full bg-transparent p-4 outline-hidden resize-none font-mono text-xs text-slate-200 placeholder-slate-700 leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0">
        <button
          onClick={handleSaveDraft}
          className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 font-scope text-[10px] font-bold uppercase tracking-wide border border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Save className="w-3 h-3" /> Save Draft
        </button>
        <button
          onClick={handlePublish}
          className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 font-scope text-[10px] font-bold uppercase tracking-wide border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Rocket className="w-3 h-3" /> Publish to Shipyard
        </button>
      </div>
    </div>
  );
}
