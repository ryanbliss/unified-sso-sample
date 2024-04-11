import { deleteBotValue, getBotValue, upsertBotValue } from "@/database/bot-state-values";
import { Storage, StoreItems } from "botbuilder";

/**
 * Storage that uses this apps mongodb database for storage
 */
export class MongoDBStorage implements Storage {
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
    if (!keys) {
      throw new ReferenceError("Keys are required when reading.");
    }
    const data: StoreItems = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const item: string = this.memory[key];
      if (item) {
        data[key] = JSON.parse(item);
      } else {
        try {
          const value = await getBotValue(key);
          const parsedValue = JSON.parse(value);
          this.memory[key] = parsedValue;
          data[key] = parsedValue;
        } catch (err) {
          console.error(err);
        }
      }
    }
    return data;
  }

  /**
   * Writes storage items to storage.
   *
   * @param changes The [StoreItems](xref:botbuilder-core.StoreItems) to write, indexed by key.
   * @returns {Promise<void>} A promise representing the async operation.
   */
  async write(changes: StoreItems): Promise<void> {
    const saveItem = async (key: string, item: any): Promise<void> => {
      const clone: any = { ...item };
      clone.eTag = (this.etag++).toString();
      const stringifiedClone = JSON.stringify(clone);
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
            `Storage: error writing "${key}" due to eTag conflict.`
          );
        }
      }
    }
  }

  /**
   * Deletes storage items from storage.
   *
   * @param keys Keys of the [StoreItems](xref:botbuilder-core.StoreItems) objects to delete.
   * @returns {Promise<void>} A promise representing the async operation.
   */
  async delete(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      await deleteBotValue(key);
      this.memory[key] = <any>undefined;
    }
  }
}
