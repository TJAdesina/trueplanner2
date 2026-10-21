import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cleanTagName, nextTagColor } from "@/lib/tags";
import type { Tag } from "@/lib/types";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("tags").select("*").order("created_at", { ascending: true });
    setTags((data as Tag[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Returns the existing tag when the name is already taken (case-insensitive). */
  const createTag = useCallback(
    async (rawName: string, color?: string): Promise<Tag | null> => {
      const name = cleanTagName(rawName);
      if (!name) return null;
      const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: user.id, name, color: color ?? nextTagColor(tags.length) })
        .select()
        .single();
      if (error || !data) {
        // Another tab may have just created it.
        await refresh();
        return null;
      }
      setTags((prev) => [...prev, data as Tag]);
      return data as Tag;
    },
    [tags, refresh]
  );

  const updateTag = useCallback(async (id: string, patch: Partial<Pick<Tag, "name" | "color">>) => {
    const supabase = createClient();
    const clean = { ...patch, ...(patch.name !== undefined ? { name: cleanTagName(patch.name) } : {}) };
    if (clean.name !== undefined && !clean.name) return;
    const { data, error } = await supabase.from("tags").update(clean).eq("id", id).select().single();
    if (!error && data) setTags((prev) => prev.map((t) => (t.id === id ? (data as Tag) : t)));
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (!error) setTags((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  return { tags, tagsById, loading, createTag, updateTag, deleteTag, refresh };
}
