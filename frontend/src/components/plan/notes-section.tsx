"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// TipTap is a heavy client-only dependency the plan page never needs until
// Notes is actually expanded — code-split it out of the initial page bundle.
const NotesEditor = dynamic(() => import("./notes-editor").then((m) => m.NotesEditor), {
  ssr: false,
  loading: () => (
    <div className="min-h-[120px] w-full px-3 py-2 text-sm font-sans text-gray-400 animate-pulse">
      Loading editor…
    </div>
  ),
});

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function NotesSection({ notes, onNotesChange }: NotesSectionProps) {
  const [expanded, setExpanded] = useState(!!notes);

  return (
    <div className="rounded-lg overflow-hidden shadow-sm bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-dark-teal)] text-white"
      >
        <span className="font-display font-bold">NOTES</span>
        <span className="text-xs opacity-60">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="p-4">
          <NotesEditor value={notes} onChange={onNotesChange} />
        </div>
      )}
    </div>
  );
}
