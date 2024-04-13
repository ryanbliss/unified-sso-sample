import { WebPubSubServiceClient } from "@azure/web-pubsub";

const connectionString = process.env.PUBSUB_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    "pubsub-client.ts: no PUBSUB_CONNECTION_STRING in your .env.local file, please add it and try again."
  );
}

export const pubsubServiceClient = new WebPubSubServiceClient(
  connectionString,
  "copilot"
);
