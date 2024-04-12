import clientPromise from "./mongodb-client";
import { Collection, ObjectId, WithId } from "mongodb";

/**
 * User base interface
 */
export interface IUserBase {
  /**
   * Email to sign in with
   */
  email: string;
  /**
   * Password to sign in with
   */
  password: string;
  /**
   * SSO connections
   */
  connections?: IAuthConnections;
}

/**
 * User type interface, which includes the ID inserted by MongoDB
 */
export type IUser = WithId<IUserBase>;
export type IUserPasswordless = Omit<IUser, "password">;

/**
 * Microsoft AAD connection for when user connected account to AAD for SSO
 */
export interface IAADConnection {
  /**
   * AAD object ID for user
   */
  oid: string;
  /**
   * Tenant ID
   */
  tid: string;
  /**
   * User principle name (usually email)
   */
  upn: string;
}

/**
 * User auth connections
 */
export interface IAuthConnections {
  /**
   * AAD connection object for when user linked their account to a Microsoft AAD account
   */
  aad?: IAADConnection;
}

async function getCollection(): Promise<Collection<IUserBase>> {
  // Get MongoDB client
  const client = await clientPromise;
  // Connect to the tenant database and access its "conversation-references" collection
  const database = client.db("unified-sso");
  const db = database.collection<IUserBase>("users");
  return db;
}

/**
 * This function is used to update the user object in MongoDB.
 * This is meant to be used as our very simple auth provider.
 * In production, your auth system should have more protections in place.
 *
 * @param user user base object to upsert
 */
export async function upsertUser(user: IUserBase): Promise<IUser> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Insert or update defined document into the collection
  const query = { email: user.email };
  const update = { $set: user };
  const options = { upsert: true };
  const result = await collection.updateOne(query, update, options);
  if (!result.acknowledged) {
    throw new Error("user upsertUser: user was not acknowledged");
  }
  if (!result.upsertedId) {
    // MongoDB only returns the upsertedId for new objects
    const updatedUser = await findUser(user.email);
    if (!updatedUser) {
      throw new Error(
        "user upsertUser: user not found after write acknowledged"
      );
    }
    return updatedUser;
  }
  return {
    _id: result.upsertedId,
    ...user,
  };
}

/**
 * Find user in MongoDB by email. Very rudimentary implementation.
 * @param email email to lookup user by
 * @returns IUser object
 */
export async function findUser(email: string): Promise<IUser | null> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Query for a movie that has the title 'The Room'
  const query = { email };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    return null;
  }
  return referenceDoc;
}

/**
 * Find user in MongoDB by oid & tid. Very rudimentary implementation.
 * @param oid oid to lookup user by
 * @param tid tid to lookup user by
 * @returns IUser object
 */
export async function findAADUser(
  oid: string,
  tid: string
): Promise<IUser | null> {
  // Get the MongoDB collection
  const collection = await getCollection();
  // Query for a movie that has the title 'The Room'
  const query = {
    connections: {
      aad: {
        oid,
        tid,
      },
    },
  };
  const options = {};
  // Execute query
  const referenceDoc = await collection.findOne(query, options);
  if (!referenceDoc) {
    console.warn(
      `user findUser: user not found for oid ${oid} and/or tid ${tid}`
    );
    return null;
  }
  return referenceDoc;
}
