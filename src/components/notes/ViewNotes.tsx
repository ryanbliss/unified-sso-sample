import { FC, useEffect, useRef, useState } from "react";
import { FlexColumn } from "../flex";
import { Card, Spinner, Title1 } from "@fluentui/react-components";
import { INoteResponse } from "@/app/models/note-base-models";

export const ViewNotes: FC = () => {
  const [notes, setNotes] = useState<INoteResponse[]>();
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
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
      setNotes(body.notes);
    }
    load();
  }, []);
  return (
    <FlexColumn marginSpacer="small">
      <Title1>{"Your notes"}</Title1>
      {!notes && <Spinner />}
      {notes && notes.map((note) => <Card key={note._id}>{note.text}</Card>)}
    </FlexColumn>
  );
};
