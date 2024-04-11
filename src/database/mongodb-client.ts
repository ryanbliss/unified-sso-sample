import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    throw new Error("Please add your MONGODB_URI to your .env.local");
}

if (process.env.NODE_ENV === "development") {
    // In dev mode, use a global variable for hot-reloading
    if (!(global as any)._mongoClientPromise) {
        client = new MongoClient(uri, options);
        (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise;
} else {
    // In prod, it's best to not use a global variable
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;