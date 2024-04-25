import clientPromise from "./mongodb-client";
import { Collection } from "mongodb";

export interface IFeatureFlag {
    key: string;
    value: unknown;
}


async function getCollection(): Promise<Collection<IFeatureFlag>> {
  // Get MongoDB client
  const client = await clientPromise;
  // Connect to the tenant database and access the collection
  const database = client.db("unified-sso");
  const db = database.collection<IFeatureFlag>("feature-flags");
  return db;
}

/**
 * Find feature
 * @param key email to lookup user by
 * @returns IUser object
 */
export async function findFeatureFlag(key: string): Promise<unknown> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Query for a movie that has the title 'The Room'
  const query = { key };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    throw new Error(`feature-flags.ts findFeatureFlag document not found for key ${key}`);
  }
  return referenceDoc.value;
}
