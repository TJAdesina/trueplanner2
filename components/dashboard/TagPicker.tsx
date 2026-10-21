"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Tag } from "@/lib/types";
import { TAG_COLORS, nextTagColor } from "@/lib/tags";

export function TagDot({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

/** A subtle, colour-coded label. Optionally removable. */
export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-charcoal/60">
      <TagDot color={tag.color} />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="-mr-0.5 rounded-full px-0.5 text-charcoal/40 hover:text-charcoal"
        >
          &times;
        </button>
      )}
    </span>
  );
}

export function TagPicker({
  tags,
  selectedIds,
  onToggle,
  onCreate,
  className = "w-64 p-2",
}: {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string, color: string) => Promise<Tag | null>;
  className?: string;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(nextTagColor(tags.length));

  async function create() {
    const clean = name.trim();
    if (!clean) return;
    const tag = await onCreate(clean, color);
    if (tag) {
      setName("");
      setColor(nextTagColor(tags.length + 1));
      if (!selectedIds.includes(tag.id)) onToggle(tag.id);
    }
  }

  return (
    <div className={className}>
      {tags.length === 0 ? (
        <p className="px-2 py-2 text-xs text-charcoal/50">No tags yet. Create your first one below.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto">
          {tags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => onToggle(tag.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-charcoal hover:bg-charcoal/5"
                >
                  <TagDot color={tag.color} className="h-2.5 w-2.5" />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {selected && <Check className="h-4 w-4 text-forest" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-1 border-t border-charcoal/10 pt-2">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            maxLength={24}
            placeholder="New tag"
            aria-label="New tag name"
            className="min-w-0 flex-1 rounded-lg border border-charcoal/15 bg-transparent px-2.5 py-1.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15"
          />
          <button
            type="button"
            onClick={create}
            disabled={!name.trim()}
            aria-label="Create tag"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest text-cream disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {name.trim() && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-surface ${color === c ? "ring-2 ring-forest" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
