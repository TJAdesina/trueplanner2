/** A small muted palette that sits comfortably next to the brand colors. */
export const TAG_COLORS = [
  "#3F8F86", // teal
  "#65B891", // sage
  "#D9B65D", // sand
  "#F4B183", // peach
  "#C9735A", // clay
  "#C77D96", // rose
  "#8A6FB3", // plum
  "#6F8FB3", // slate
] as const;

export function nextTagColor(existingCount: number): string {
  return TAG_COLORS[existingCount % TAG_COLORS.length];
}

export function cleanTagName(name: string): string {
  return name.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 24);
}
