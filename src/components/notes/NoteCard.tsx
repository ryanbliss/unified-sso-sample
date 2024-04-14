import { INoteResponse } from "@/models/note-base-models";
import { Button, Caption1, Card, tokens } from "@fluentui/react-components";
import { NoteEdit20Regular, Delete20Regular } from "@fluentui/react-icons";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../flex";

interface INoteCardProps {
  note: INoteResponse;
}

export const NoteCard: FC<INoteCardProps> = ({ note }) => {
  const [deleting, setDeleting] = useState(false);
  const onEdit = () => {
    //
  };
  const onDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const response = await fetch(`/api/notes/${note._id}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await response.json();
    if (response.status !== 200) {
      console.error(body.error);
      setDeleting(false);
      return;
    }
    // On 200, this card should get removed by the PubSub websocket listener in ViewNotes.tsx
  };
  return (
    <Card
      style={{
        backgroundColor: tokens.colorPaletteYellowBackground2,
      }}
    >
      <FlexColumn marginSpacer="small">
        <FlexRow>{note.text}</FlexRow>
        <FlexRow spaceBetween vAlign="center">
          <Caption1>{`Created ${note.createdAt.toString()}`}</Caption1>
          <FlexRow vAlign="center">
            <Button
              icon={<NoteEdit20Regular />}
              appearance="subtle"
              title="Edit note"
              onClick={onEdit}
              disabled={deleting}
            />
            <Button
              icon={<Delete20Regular />}
              appearance="subtle"
              title="Delete note"
              onClick={onDelete}
              disabled={deleting}
            />
          </FlexRow>
        </FlexRow>
      </FlexColumn>
    </Card>
  );
};
