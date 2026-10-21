// "cut", "archived" and the legacy in-flight states only exist for rows
// created before v2. New work only ever uses "not_started" and "completed".
export type TaskStatus =
  | "not_started"
  | "completed"
  | "cut"
  | "archived"
  | "in_progress"
  | "paused"
  | "shrunk"
  | "moved"
  | "overdue";

export type TaskPriority = "low" | "medium" | "high";
export type Recurrence = "daily" | "weekdays" | "weekly";

export type CheckinStatus = "pending" | "actioned" | "dismissed";
export type CheckinAction = "cut" | "shrink" | "move";
/** What the interface calls the three recovery moves. "remove" is stored as "cut". */
export type SuggestedAction = "shrink" | "move" | "remove";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** Both times are set together, or neither is. */
  start_time: string | null;
  end_time: string | null;
  /** The calendar day this task belongs to, as YYYY-MM-DD in the user's time zone. */
  task_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  move_count: number;
  original_scope: string | null;
  last_checkin_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  recurrence: Recurrence | null;
  remind_at_start: boolean;
  reminded_at: string | null;
  checklist: ChecklistItem[];
  /** Derived from the task_tags join table. */
  tag_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskDraft {
  title: string;
  description?: string | null;
  task_date: string;
  start_time?: string | null;
  end_time?: string | null;
  priority?: TaskPriority;
  recurrence?: Recurrence | null;
  remind_at_start?: boolean;
  checklist?: ChecklistItem[];
  tag_ids?: string[];
  /** Set when a task is created already past its time, so it isn't flagged as slipped. */
  last_checkin_at?: string | null;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  user_id: string;
  event_type: string;
  detail: string | null;
  created_at: string;
}

/** The concrete next moves attached to a check-in. */
export interface Suggestion {
  recommended: SuggestedAction;
  shrink: { title: string; start: string; end: string };
  move: { start: string; end: string; label: string };
}

export interface Checkin {
  id: string;
  user_id: string;
  task_id: string | null;
  trigger_type: string;
  headline: string;
  message: string;
  status: CheckinStatus;
  resolved_action: CheckinAction | null;
  source: "template" | "gemini";
  suggestion: Suggestion | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  timezone: string;
  notifications_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  working_hours_start: string;
  working_hours_end: string;
  theme: "light" | "dark" | "system";
  ai_processing_enabled: boolean;
  checkin_gap_minutes: number;
  eod_prompted_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinContent {
  headline: string;
  message: string;
  shrinkTitle?: string;
  source: "template" | "gemini";
}
