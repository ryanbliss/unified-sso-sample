import { deleteBotValue, getBotValue, upsertBotValue } from "@/server/database/bot-state-values";
import { Storage, StoreItems } from "botbuilder";

/**
 * Storage that uses mongodb database for bot storage
 */
export class MongoDBBotStorage implements Storage {
  protected etag: number;
  protected memory: { [k: string]: string } = {};
  /**
   * Creates a new MongodbStorage instance.
   */
  constructor() {
    this.etag = 1;
  }

  /**
   * Reads storage items from storage.
   *
   * @param keys Keys of the [StoreItems](xref:botbuilder-core.StoreItems) objects to read.
   * @returns The read items.
   */
  async read(keys: string[]): Promise<StoreItems> {
    console.log("MongoDBStorage.read: reading changes");
    if (!keys) {
      throw new ReferenceError("Keys are required when reading.");
    }
    const data: StoreItems = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const item = this.memory[key];
      if (item) {
        console.log("MongoDBStorage.read: found item in memory with key", key, "and value", item);
        data[key] = JSON.parse(item);
      } else {
        try {
          console.log("MongoDBStorage.read: getting item with key", key);
          const value = await getBotValue(key);
          console.log("MongoDBStorage.read: got item from MongoDB with key", key, "and value", value);
          const parsedValue = JSON.parse(value);
          this.memory[key] = value;
          data[key] = parsedValue;
        } catch (err) {
          console.warn(err);
        }
      }
    }
    console.log("MongoDBStorage.read: done", data);
    return data;
  }

  /**
   * Writes storage items to storage.
   *
   * @param changes The [StoreItems](xref:botbuilder-core.StoreItems) to write, indexed by key.
   * @returns {Promise<void>} A promise representing the async operation.
   */
  async write(changes: StoreItems): Promise<void> {
    console.log("MongoDBStorage.write: writing changes");
    const saveItem = async (key: string, item: any): Promise<void> => {
      console.log("MongoDBStorage.write: cloning item", item);
      const clone: any = Object.assign({}, item);
      clone.eTag = (this.etag++).toString();
      const stringifiedClone = JSON.stringify(clone);
      console.log("MongoDBStorage.write: saving stringifiedClone", stringifiedClone);
      try {
        await upsertBotValue(key, stringifiedClone);
        this.memory[key] = stringifiedClone;
      } catch (err) {
        console.error(err);
        throw err;
      }
    };

    if (!changes) {
      throw new ReferenceError("Changes are required when writing.");
    }
    const keys = Object.keys(changes);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const newItem: any = changes[key];
      const old: string = this.memory[key];
      if (!old || newItem.eTag === "*" || !newItem.eTag) {
        await saveItem(key, newItem);
      } else {
        const oldItem: any = <any>JSON.parse(old);
        if (newItem.eTag === oldItem.eTag) {
          await saveItem(key, newItem);
        } else {
          throw new Error(
            `Storage: error writing "${key}" due to eTag conflict. new: ${newItem.eTag}, old: ${oldItem.etag}`
          );
        }
      }
    }
    console.log("MongoDBStorage.write: done");
  }

  /**
   * Deletes storage items from storage.
   *
   * @param keys Keys of the [StoreItems](xref:botbuilder-core.StoreItems) objects to delete.
   * @returns {Promise<void>} A promise representing the async operation.
   */
  async delete(keys: string[]): Promise<void> {
    console.log("MongoDBStorage.delete: deleting");
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      await deleteBotValue(key);
      this.memory[key] = <any>undefined;
    }
    console.log("MongoDBStorage.delete: done");
  }
}
