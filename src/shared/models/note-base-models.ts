export interface INoteBase {
  text: string;
  color: string;
  createdAt: Date;
  editedAt: Date;
  threadId?: string;
}

export interface INoteResponse extends INoteBase {
  _id: string;
  createdById: string;
}

export function isINoteResponse(obj: any): obj is INoteResponse {
  if (!obj) return false;
  if (typeof obj.createdAt === "string") {
    obj.createdAt = new Date(obj.createdAt);
  }
  if (typeof obj.editedAt === "string") {
    obj.editedAt = new Date(obj.editedAt);
  }
  return (
    typeof obj === "object" &&
    typeof obj.text === "string" &&
    typeof obj.color === "string" &&
    obj.createdAt instanceof Date &&
    obj.editedAt instanceof Date &&
    (obj.threadId === undefined || typeof obj.threadId === "string") && // threadId is optional
    typeof obj._id === "string" &&
    typeof obj.createdById === "string"
  );
}

export interface IDeleteNoteResponse {
  deletedId: string;
}

export function isIDeleteNoteResponse(value: any): value is IDeleteNoteResponse {
  return value && typeof value.deletedId === "string";
}
