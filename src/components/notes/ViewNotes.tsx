import { FC, useEffect, useRef, useState } from "react";
import { FlexColumn } from "../flex";
import { Card, Spinner, Title1, tokens } from "@fluentui/react-components";
import { INoteResponse } from "@/models/note-base-models";
import { usePubSubClient } from "@/hooks/usePubSubClient";
import { OnConnectedArgs, OnDisconnectedArgs, OnGroupDataMessageArgs, OnServerDataMessageArgs } from "@azure/web-pubsub-client";

export const ViewNotes: FC = () => {
  const [notes, setNotes] = useState<INoteResponse[]>();
  const hasStarted = useRef(false);
  const { client } = usePubSubClient();
  useEffect(() => {
    if (hasStarted.current) return;
    let mounted = true;
    hasStarted.current = true;
    async function load() {
      const response = await fetch("/api/notes/list/my", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const body = await response.json();
      if (response.status !== 200) {
        console.error(body.error);
        return;
      }
      if (!mounted) return;
      setNotes(body.notes);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!client) return;
    // Emitted on websocket connected
    const connectedListener = (e: OnConnectedArgs) => {
      console.log(e);
    }
    client.on("connected", connectedListener);

    // Emitted on websocket disconnected
    const disconnectedListener = (e: OnDisconnectedArgs) => {
      console.log(e);
    }
    client.on("disconnected", disconnectedListener);
    
    // Emitted on group message
    const groupMessageListener = (e: OnGroupDataMessageArgs) => {
      console.log(e);
    }
    client.on("group-message", groupMessageListener);

    // Emitted on server message
    const serverMessageListener = (e: OnServerDataMessageArgs) => {
      console.log(e);
    }
    client.on("server-message", serverMessageListener);

    client.start()
      .catch((err) => console.error(err));
    return () => {
      client.off("connected", connectedListener);
      client.off("disconnected", disconnectedListener);
      client.off("group-message", groupMessageListener);
      client.off("server-message", serverMessageListener);
    }
  }, [client]);

  return (
    <FlexColumn marginSpacer="small">
      <Title1>{"Notes"}</Title1>
      {!notes && <Spinner />}
      {notes &&
        notes.map((note) => (
          <Card
            key={note._id}
            style={{
              backgroundColor: tokens.colorPaletteYellowBackground2,
            }}
          >
            {note.text}
          </Card>
        ))}
    </FlexColumn>
  );
};
