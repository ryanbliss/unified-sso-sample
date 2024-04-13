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
