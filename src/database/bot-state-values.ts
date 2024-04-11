import clientPromise from "./mongodb-client";
import { Collection } from "mongodb";

interface BotStateDocument {
  key: string;
  value: string;
}

async function getCollection(): Promise<Collection<BotStateDocument>> {
  // Get MongoDB client
  const client = await clientPromise;
  // Connect to the tenant database and access its "conversation-references" collection
  const database = client.db("unified-sso");
  const conversationReferencesDb =
    database.collection<BotStateDocument>("bot-state");
  return conversationReferencesDb;
}

export async function upsertBotValue(
  key: string,
  value: string
): Promise<void> {
  // Get the MongoDB collection
  const collection = await getCollection();
  const doc = {
    key,
    value,
  };
  // Insert or update defined document into the collection
  const query = { key };
  const update = { $set: doc };
  const options = { upsert: true };
  await collection.updateOne(query, update, options);
}

export async function getBotValue(key: string): Promise<string> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Query for key
  const query = { key };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    throw new Error(
      "bot-state-values getBotValue: value not found for key " + key
    );
  }
  return referenceDoc.value;
}

export async function deleteBotValue(key: string): Promise<void> {
  // Get the MongoDB collection
  const collection = await getCollection();
  const query = { key };
  const result = await collection.deleteOne(query);
  /* Print a message that indicates whether the operation deleted a
    document */
  if (result.deletedCount == 1) {
    console.log("bot-state-values deleteBotValue: Successfully deleted one document.");
  } else {
    console.log("bot-state-values deleteBotValue: No documents matched the query. Deleted 0 documents.");
  }
}
