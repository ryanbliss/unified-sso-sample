import { FC, useEffect, useRef, useState } from "react";
import { FlexColumn } from "../flex";
import { Spinner, Title1 } from "@fluentui/react-components";
import {
  IDeleteNoteResponse,
  INoteResponse,
  isIDeleteNoteResponse,
  isINoteResponse,
} from "@/models/note-base-models";
import { usePubSubClient } from "@/hooks/usePubSubClient";
import {
  OnConnectedArgs,
  OnDisconnectedArgs,
  OnGroupDataMessageArgs,
  OnServerDataMessageArgs,
} from "@azure/web-pubsub-client";
import { isPubSubEvent } from "@/models/pubsub-event-types";
import { NoteCard } from "./NoteCard";
import { IUserClientState, isIUserClientState } from "@/models/user-client-state";
import { useTeamsClientContext } from "@/context-providers";

export const ViewNotes: FC = () => {
  const [notes, setNotes] = useState<INoteResponse[]>();
  const hasRequestedInitialNotesRef = useRef(false);
  const hasStartedPubSub = useRef(false);
  const { client } = usePubSubClient();
  const { threadId } = useTeamsClientContext();

  // Card being edited (can only be one at a time)
  const [clientState, setClientState] = useState<IUserClientState>({
    threadId,
  });

  useEffect(() => {
    if (hasRequestedInitialNotesRef.current) return;
    let mounted = true;
    hasRequestedInitialNotesRef.current = true;
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
      const resNotes = body.notes;
      if (!Array.isArray(resNotes)) return;
      for (let i = 0; i < resNotes.length; i++) {
        if (!isINoteResponse(resNotes[i])) return;
      }
      setNotes(
        resNotes.sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime())
      );
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Emitted on websocket connected
    const connectedListener = (e: OnConnectedArgs) => {
      console.log("connectedListener", e);
    };
    client?.on("connected", connectedListener);

    // Emitted on websocket disconnected
    const disconnectedListener = (e: OnDisconnectedArgs) => {
      console.log("disconnectedListener", e);
    };
    client?.on("disconnected", disconnectedListener);

    // Emitted on group message
    const groupMessageListener = (e: OnGroupDataMessageArgs) => {
      if (e.message.dataType !== "json") return;
      const messageData = e.message.data;
      if (isPubSubEvent<INoteResponse>(messageData, isINoteResponse)) {
        const changedNote = messageData.data;
        // Add or edit note in local list
        if (!notes) {
          setNotes([changedNote]);
          return;
        }
        setNotes(
          [
            ...notes.filter((note) => note._id !== changedNote._id),
            changedNote,
          ].sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime())
        );
        return;
      } else if (
        isPubSubEvent<IDeleteNoteResponse>(messageData, isIDeleteNoteResponse)
      ) {
        if (!notes) return;
        // Delete note from local list
        setNotes(
          [
            ...notes.filter((note) => note._id !== messageData.data.deletedId),
          ].sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime())
        );
        return;
      } else if (isPubSubEvent<IUserClientState>(messageData, isIUserClientState)) {
        // The bot changed the client state, so we set it
        setClientState(messageData.data);
      }
      console.log("groupMessageListener: invalid type", messageData);
    };
    client?.on("group-message", groupMessageListener);

    // Emitted on server message
    const serverMessageListener = (e: OnServerDataMessageArgs) => {
      console.log("serverMessageListener", e);
    };
    client?.on("server-message", serverMessageListener);

    if (!hasStartedPubSub.current && client) {
      hasStartedPubSub.current = true;
      client.start().catch((err) => {
        console.error(`ViewNotes client.start() error: ${err}`);
      });
    }
    return () => {
      client?.off("connected", connectedListener);
      client?.off("disconnected", disconnectedListener);
      client?.off("group-message", groupMessageListener);
      client?.off("server-message", serverMessageListener);
    };
  }, [client, notes, clientState]);

  return (
    <FlexColumn marginSpacer="small">
      <Title1>{"Notes"}</Title1>
      {!notes && <Spinner />}
      {notes &&
        notes.map((note) => (
          <NoteCard
            key={note._id}
            note={note}
            clientState={clientState}
            setClientState={setClientState}
          />
        ))}
    </FlexColumn>
  );
};
