import { ConversationReference } from "botbuilder";
import clientPromise from "./mongodb-client";
import { Collection } from "mongodb";

interface ConversationReferenceDocument {
  id: string;
  reference: Partial<ConversationReference>;
}

async function getCollection(): Promise<
  Collection<ConversationReferenceDocument>
> {
  // Get MongoDB client
  const client = await clientPromise;
  // Connect to the tenant database and access its "conversation-references" collection
  const database = client.db("unified-sso");
  const conversationReferencesDb =
    database.collection<ConversationReferenceDocument>(
      "conversation-references"
    );
  return conversationReferencesDb;
}

export async function upsertReference(
  id: string,
  reference: Partial<ConversationReference>
): Promise<void> {
  // Get the MongoDB collection
  const collection = await getCollection();
  const doc = {
    id,
    reference: reference,
  };
  // Insert or update defined document into the collection
  const query = { id };
  const update = { $set: doc };
  const options = { upsert: true };
  await collection.updateOne(query, update, options);
}

export async function findReference(
  referenceId: string
): Promise<Partial<ConversationReference>> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Query for a movie that has the title 'The Room'
  const query = { id: referenceId };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    throw new Error(
      "conversation-references findReference: reference not found for id " +
        referenceId
    );
  }
  return referenceDoc.reference;
}
