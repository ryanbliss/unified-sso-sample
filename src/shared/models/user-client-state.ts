import { INoteResponse } from "./note-base-models";

export type EditNoteClientState = Pick<INoteResponse, "_id" | "text">;

export interface IUserClientState {
  /**
   * Note the user is editing, and current text set.
   */
  editingNote?: EditNoteClientState;
  /**
   * Thread ID
   */
  threadId?: string;
}

export function isIUserClientState(value: any): value is IUserClientState {
  return (
    value &&
    typeof value === "object" &&
    (!value.editingNote || typeof value.editingNote === "object") &&
    (!value.threadId || typeof value.threadId === "string")
  );
}
