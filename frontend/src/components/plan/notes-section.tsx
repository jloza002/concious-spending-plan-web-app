"use client";

import { useState } from "react";
import { NotesEditor } from "./notes-editor";

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
