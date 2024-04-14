import { INoteResponse } from "@/models/note-base-models";
import {
  Button,
  Caption1,
  Card,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import { NoteEdit20Regular, Delete20Regular } from "@fluentui/react-icons";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../flex";

interface INoteCardProps {
  note: INoteResponse;
}

export const NoteCard: FC<INoteCardProps> = ({ note }) => {
  const [disabled, setDisabled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);

  const onToggleEdit = () => {
    setEditing(!editing);
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
    setEditing(false);
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
            <FlexRow>{note.text}</FlexRow>
            <FlexRow spaceBetween vAlign="center">
              <Caption1>{`Last edited at ${note.editedAt.toISOString()}`}</Caption1>
              <FlexRow vAlign="center">
                <Button
                  icon={<NoteEdit20Regular />}
                  appearance="subtle"
                  title="Edit note"
                  onClick={onToggleEdit}
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
                setEditText(data.value);
              }}
            />
            <FlexRow spaceBetween>
              <Button disabled={disabled} onClick={onToggleEdit}>
                {"Cancel"}
              </Button>
              <Button disabled={disabled} onClick={onSaveEdit}>
                {"Save"}
              </Button>
            </FlexRow>
          </>
        )}
      </FlexColumn>
    </Card>
  );
};
