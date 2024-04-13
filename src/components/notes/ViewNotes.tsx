import { FC, useEffect, useRef, useState } from "react";
import { FlexColumn } from "../flex";
import { Card, Spinner, Title1, tokens } from "@fluentui/react-components";
import { INoteResponse } from "@/app/models/note-base-models";

export const ViewNotes: FC = () => {
  const [notes, setNotes] = useState<INoteResponse[]>();
  const hasStarted = useRef(false);
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
  return (
    <FlexColumn marginSpacer="small">
      <Title1>{"Your notes"}</Title1>
      {!notes && <Spinner />}
      {notes &&
        notes.map((note) => (
          <Card
            key={note._id}
            style={{
              backgroundColor: tokens.colorPaletteYellowBackground3,
            }}
          >
            {note.text}
          </Card>
        ))}
    </FlexColumn>
  );
};
