"use client";

import { useState } from "react";

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
        <span className="text-xs opacity-60">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="p-4">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes about your spending plan..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-sans
              focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent
              resize-y min-h-[80px]"
          />
        </div>
      )}
    </div>
  );
}
