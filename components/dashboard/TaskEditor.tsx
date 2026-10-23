"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TimeFields } from "./TimeFields";
import { PriorityPicker, RecurrencePicker } from "./OptionFields";
import { TagChip, TagPicker } from "./TagPicker";
import { DEFAULT_DURATION_MINUTES, durationMinutes } from "@/lib/tasks";
import { keyToLocalDate, todayKey, toTimeInput } from "@/lib/time";
import type { TaskPatch } from "@/lib/taskOps";
import type { ChecklistItem, Recurrence, Tag, Task, TaskPriority } from "@/lib/types";

interface TaskEditorProps {
  task: Task;
  tags: Tag[];
  onClose: () => void;
  onCreateTag: (name: string, color?: string) => Promise<Tag | null>;
  onSave: (task: Task, patch: TaskPatch, tagIds: string[]) => Promise<void>;
  onDelete: (task: Task) => void;
}

const label = "mb-2 block text-xs font-medium text-charcoal/55";
const input =
  "w-full rounded-lg border border-charcoal/15 bg-surface px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15";

export function TaskEditor({ task, tags, onClose, onCreateTag, onSave, onDelete }: TaskEditorProps) {
  const today = todayKey();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [day, setDay] = useState(task.task_date);
  const [start, setStart] = useState<string | null>(task.start_time ? toTimeInput(new Date(task.start_time)) : null);
  const [duration, setDuration] = useState(durationMinutes(task) ?? DEFAULT_DURATION_MINUTES);
  const [remind, setRemind] = useState(task.remind_at_start);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [tagIds, setTagIds] = useState<string[]>(task.tag_ids);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(task.recurrence);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist);
  const [newItem, setNewItem] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTags = tags.filter((t) => tagIds.includes(t.id));

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewItem("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let startIso: string | null = null;
      let endIso: string | null = null;
      if (start) {
        const s = keyToLocalDate(day, start);
        startIso = s.toISOString();
        endIso = new Date(s.getTime() + duration * 60_000).toISOString();
      }
      await onSave(
        task,
        {
          title: title.trim(),
          description: description.trim() || null,
          task_date: day,
          start_time: startIso,
          end_time: endIso,
          priority,
          recurrence,
          remind_at_start: Boolean(start) && remind,
          checklist: checklist.filter((i) => i.text.trim()),
        },
        tagIds
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit task" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-6">
        <div>
          <label htmlFor="edit-title" className="sr-only">
            Title
          </label>
          <input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className={`${input} text-base font-medium`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Details, links, or notes"
            aria-label="Details"
            className={`${input} mt-2 resize-none`}
          />
        </div>

        <div>
          <span className={label}>When</span>
          <div className="rounded-xl border border-charcoal/10">
            <TimeFields
              className="space-y-4 p-4"
              today={today}
              value={{ day, start, duration, remind }}
              onChange={(patch) => {
                if (patch.day !== undefined) setDay(patch.day);
                if (patch.start !== undefined) setStart(patch.start);
                if (patch.duration !== undefined) setDuration(patch.duration);
                if (patch.remind !== undefined) setRemind(patch.remind);
              }}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className={label}>Priority</span>
            <PriorityPicker value={priority} onChange={setPriority} />
          </div>
          <div>
            <span className={label}>Repeat</span>
            <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          </div>
        </div>

        <div>
          <span className={label}>Tags</span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedTags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center rounded-full bg-charcoal/[0.045] px-2.5 py-1">
                <TagChip tag={tag} onRemove={() => setTagIds((prev) => prev.filter((id) => id !== tag.id))} />
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowTags((v) => !v)}
              aria-expanded={showTags}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-charcoal/25 px-2.5 py-1 text-xs font-medium text-charcoal/60 hover:bg-charcoal/5"
            >
              <TagIcon className="h-3 w-3" strokeWidth={2} />
              {selectedTags.length ? "Edit tags" : "Add tag"}
            </button>
          </div>
          {showTags && (
            <div className="mt-2 rounded-xl border border-charcoal/10">
              <TagPicker
                className="w-full p-2"
                tags={tags}
                selectedIds={tagIds}
                onToggle={(id) => setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
                onCreate={(name, color) => onCreateTag(name, color)}
              />
            </div>
          )}
        </div>

        <div>
          <span className={label}>Checklist</span>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) =>
                    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))
                  }
                  aria-label={`Mark "${item.text}" done`}
                  className="h-4 w-4 rounded border-charcoal/30 accent-[rgb(var(--color-forest))]"
                />
                <input
                  value={item.text}
                  onChange={(e) =>
                    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))
                  }
                  aria-label="Checklist item"
                  className={`min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 text-sm focus:bg-charcoal/[0.04] focus:outline-none ${
                    item.done ? "text-charcoal/40 line-through" : "text-charcoal"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))}
                  aria-label="Remove item"
                  className="rounded-full p-1 text-charcoal/35 hover:bg-charcoal/5 hover:text-charcoal"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-center gap-2">
            <Plus className="h-4 w-4 text-charcoal/40" aria-hidden="true" />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              onBlur={addItem}
              placeholder="Add an item"
              aria-label="New checklist item"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-charcoal/10 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(task);
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#B3492B] hover:bg-[#B3492B]/10"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Delete
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
