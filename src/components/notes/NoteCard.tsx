import { INoteResponse } from "@/models/note-base-models";
import {
  Button,
  Caption1,
  Card,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  NoteEdit20Regular,
  Delete20Regular,
  Wand20Regular,
} from "@fluentui/react-icons";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../flex";
import { WebPubSubClient } from "@azure/web-pubsub-client";
import { UserClientState } from "@/models/user-client-state";
import { useTeamsClientContext } from "@/context-providers";

interface INoteCardProps {
  note: INoteResponse;
  editingId: string | undefined;
  setEditingId: (text?: string) => void;
  client?: WebPubSubClient;
}

export const NoteCard: FC<INoteCardProps> = ({
  note,
  client,
  editingId,
  setEditingId,
}) => {
  const [disabled, setDisabled] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const { threadId } = useTeamsClientContext();

  const editing = note._id === editingId;

  const onEdit = async () => {
    setEditingId(note._id);
    if (!client) return;
    sendClientStateToServer(client, false, note, editText, threadId).catch(
      (err) => console.error(err)
    );
  };

  const onCancelEdit = async () => {
    setEditingId(undefined);
    if (!client) return;
    sendClientStateToServer(client, false, note, editText, threadId).catch(
      (err) => console.error(err)
    );
  };

  const onEditText = async (newText: string) => {
    setEditText(newText);
    if (!client) return;
    sendClientStateToServer(client, false, note, newText, threadId).catch(
      (err) => console.error(err)
    );
  };

  const requestSuggestions = async () => {
    client?.sendEvent(
      "request-suggestions",
      {
        threadId,
      },
      "json",
      {
        fireAndForget: true,
      }
    );
  };

  const onDelete = async () => {
    if (disabled) return;
    setDisabled(true);
    const response = await fetch(`/api/notes/${note._id}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await response.json();
    if (response.status !== 200) {
      console.error(body.error);
      setDisabled(false);
      return;
    }
    // On 200, this card should get removed by the PubSub websocket listener in ViewNotes.tsx
  };
  const onSaveEdit = async () => {
    if (disabled) return;
    setDisabled(true);
    const response = await fetch(`/api/notes/${note._id}/edit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: editText,
        color: note.color,
        threadId: note.threadId,
      }),
    });
    const body = await response.json();
    setDisabled(false);
    if (response.status !== 200) {
      console.error(body.error);
      return;
    }
    onCancelEdit();
    // On 200, this card should get updated by the PubSub websocket listener in ViewNotes.tsx
  };

  return (
    <Card
      style={{
        backgroundColor: tokens.colorPaletteYellowBackground2,
      }}
    >
      <FlexColumn marginSpacer="small">
        {!editing && (
          <>
            <FlexRow>
              <Text weight="medium">{note.text}</Text>
            </FlexRow>
            <FlexRow spaceBetween vAlign="center">
              <Caption1>{`Last edited at ${note.editedAt.toISOString()}`}</Caption1>
              <FlexRow vAlign="center">
                <Button
                  icon={<NoteEdit20Regular />}
                  appearance="subtle"
                  title="Edit note"
                  onClick={onEdit}
                  disabled={disabled}
                />
                <Button
                  icon={<Delete20Regular />}
                  appearance="subtle"
                  title="Delete note"
                  onClick={onDelete}
                  disabled={disabled}
                />
              </FlexRow>
            </FlexRow>
          </>
        )}
        {editing && (
          <>
            <Textarea
              value={editText}
              placeholder={"Enter note text..."}
              onChange={(ev, data) => {
                onEditText(data.value);
              }}
            />
            <FlexRow spaceBetween vAlign="center">
              <Button disabled={disabled} onClick={onCancelEdit}>
                {"Cancel"}
              </Button>
              <FlexRow vAlign="center">
                <Button
                  icon={<Wand20Regular />}
                  appearance="subtle"
                  title="Suggest improvements"
                  onClick={requestSuggestions}
                  disabled={disabled}
                />
                <Button
                  appearance="primary"
                  disabled={disabled}
                  onClick={onSaveEdit}
                >
                  {"Save"}
                </Button>
              </FlexRow>
            </FlexRow>
          </>
        )}
      </FlexColumn>
    </Card>
  );
};

// Send user's local state to server so the bot can help give assistance when needed
async function sendClientStateToServer(
  client: WebPubSubClient,
  editing: boolean,
  savedNote?: INoteResponse,
  editText?: string,
  threadId?: string
) {
  const clientState: UserClientState = {
    editingNote: editing
      ? {
          _id: savedNote!._id,
          text: editText!,
        }
      : undefined,
    threadId,
  };
  await client.sendEvent("update-client-state", clientState, "json", {
    fireAndForget: true,
  });
}
