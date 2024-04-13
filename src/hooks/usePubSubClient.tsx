import { useEffect, useRef, useState } from "react";
import { WebPubSubClient } from "@azure/web-pubsub-client";

export const usePubSubClient = () => {
  const [client, setClient] = useState<WebPubSubClient>();
  const [error, setError] = useState<Error>();
  const attemptedRef = useRef(false);
  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    // Fetch a token and create WebPubSubClient
    async function buildClient() {
      try {
        const response = await fetch("/api/pubsub/authorize/private", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const body = await response.json();
        if (response.status !== 200) {
            throw new Error(body.error);
        }
        const connectionUrl = body?.connectionUrl;
        if (typeof connectionUrl !== "string") {
            throw new Error("Invalid response from pubsub authorize endpoint");
        }
        const client = new WebPubSubClient(connectionUrl);
        setClient(client);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            setError(err);
        } else {
            setError(new Error("An unknown error occurred"));
        }
      }
    }
  }, []);

  return {
    client,
  };
};