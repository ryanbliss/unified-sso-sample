import { INoteBase } from "@/models/note-base-models";
import clientPromise from "./mongodb-client";
import { Collection, ObjectId, WithId } from "mongodb";

interface NoteDocument extends INoteBase {
  createdById: ObjectId;
}

export type NoteEditable = Omit<
  NoteDocument,
  "createdAt" | "editedAt" | "createdById"
>;
export type Note = WithId<NoteDocument>;

async function getCollection(): Promise<Collection<NoteDocument>> {
  // Get MongoDB client
  const client = await clientPromise;
  // Connect to the tenant database and access its "notes" collection
  const database = client.db("unified-sso");
  const conversationReferencesDb = database.collection<NoteDocument>("notes");
  return conversationReferencesDb;
}

export async function createNote(
  createNote: NoteEditable,
  createdById: string
): Promise<Note> {
  console.log("notes createNote: getting collection");
  // Get the MongoDB collection
  const collection = await getCollection();
  const doc = {
    ...createNote,
    createdAt: new Date(),
    editedAt: new Date(),
    createdById: new ObjectId(createdById),
  };
  console.log("notes createNote: got collection");
  // Insert or update defined document into the collection
  const note = await collection.insertOne(doc);
  console.log("notes createNote: inserted");
  return {
    _id: note.insertedId,
    ...doc,
  };
}

export async function editNote(
  noteId: string,
  editableNote: NoteEditable
): Promise<Note> {
  console.log("notes editNote: getting collection");
  // Get the MongoDB collection
  const collection = await getCollection();
  const startNote = await getNote(noteId);
  const doc = {
    ...editableNote,
    createdAt: startNote.createdAt,
    editedAt: new Date(),
    createdById: startNote.createdById,
  };
  console.log("notes editNote: got collection");
  // Insert or update defined document into the collection
  const query = { _id: new ObjectId(noteId) };
  const update = { $set: doc };
  const options = { upsert: false };
  const result = await collection.updateOne(query, update, options);
  if (!result.acknowledged) {
    throw new Error("notes editNote: unable to edit note");
  }
  console.log("notes editNote: inserted");
  const note = await getNote(noteId);
  return note;
}

export async function getNote(id: string): Promise<Note> {
  console.log("notes getNote: getting note for id", id);
  // Get the MongoDB collection
  const collection = await getCollection();
  console.log("notes getNote: got collection");
  // Query for key
  const query = { _id: new ObjectId(id) };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    throw new Error("notes getNote: value not found for id " + id);
  }
  console.log("notes getNote: got note for id", id);
  return referenceDoc;
}

export async function getUserNotes(userId: string): Promise<Note[]> {
  console.log("notes getUserNotes: getting user notes for userId", userId);
  // Get the MongoDB collection
  const collection = await getCollection();
  console.log("notes getUserNotes: got collection");
  // Query for key
  const query = { createdById: new ObjectId(userId) };
  const options = {};
  // Execute query
  const cursor = collection.find(query, options);
  // IMPORTANT: this result is not paginated. In production, better to paginate results.
  const notes = await cursor.toArray();
  console.log("notes getUserNotes: got notes for userId", userId);
  return notes;
}

export async function deleteNote(id: string): Promise<void> {
  console.log("notes deleteNote: deleting note", id);
  // Get the MongoDB collection
  const collection = await getCollection();
  const query = { _id: new ObjectId(id) };
  const result = await collection.deleteOne(query);
  /* Print a message that indicates whether the operation deleted a
    document */
  if (result.deletedCount == 1) {
    console.log("notes deleteNote: Successfully deleted one document.");
  } else {
    console.warn(
      "notes deleteNote: No documents matched the query. Deleted 0 documents."
    );
  }
}

export function isNoteEditable(obj: any): obj is NoteEditable {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.text === "string" &&
    typeof obj.color === "string" &&
    // Check that the properties that should not be in NoteEditable do not exist in the object
    obj.createdAt === undefined &&
    obj.editedAt === undefined &&
    obj.createdById === undefined &&
    // Optional property check: threadId must either be undefined or a string
    (obj.threadId === undefined || typeof obj.threadId === "string")
  );
}
