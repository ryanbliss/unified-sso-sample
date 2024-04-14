import { INoteResponse } from "./note-base-models";

export type EditNoteClientState = Pick<INoteResponse, "_id" | "text">;

export interface UserClientState {
  /**
   * Note the user is editing, and current text set.
   */
  editingNote?: EditNoteClientState;
  /**
   * Thread ID
   */
  threadId?: string;
}
