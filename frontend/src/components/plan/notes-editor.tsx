"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

interface NotesEditorProps {
  value: string;
  onChange: (html: string) => void;
}

/** Treat empty TipTap output as truly empty so we don't persist "<p></p>". */
function normalize(html: string): string {
  return html === "<p></p>" ? "" : html;
}

export function NotesEditor({ value, onChange }: NotesEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // avoid SSR hydration mismatch in Next.js
    extensions: [
      StarterKit,
      Underline,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "notes-prose min-h-[120px] w-full px-3 py-2 focus:outline-none text-sm font-sans text-gray-800",
      },
    },
    onUpdate: ({ editor }) => onChange(normalize(editor.getHTML())),
  });

  // Sync external value in only when the editor isn't focused, so a debounced
  // save round-trip can't overwrite the user mid-keystroke.
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const current = normalize(editor.getHTML());
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[160px] rounded-lg border border-gray-200 bg-white animate-pulse" />
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-orange)] focus-within:border-transparent">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm font-sans transition-colors disabled:opacity-30 ${
        active ? "bg-[#15302F] text-[var(--color-warm-beige)]" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60">
      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        ¶
      </ToolbarButton>
      <ToolbarButton title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </ToolbarButton>
      <ToolbarButton
        title="Indent (nest — switches to letters / roman)"
        disabled={!editor.can().sinkListItem("listItem")}
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
      >
        →
      </ToolbarButton>
      <ToolbarButton
        title="Outdent"
        disabled={!editor.can().liftListItem("listItem")}
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
      >
        ←
      </ToolbarButton>
    </div>
  );
}
