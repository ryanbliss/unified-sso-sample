import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";

export const BotGetRosterExample: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setErr] = useState<string>();
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        <FlexRow>
          <Button
            onClick={async () => {
              try {
                const response = await client.conversation.bot.getPagedRoster();
                setRes(JSON.stringify(response, null, 4));
              } catch (err: unknown) {
                const message: string =
                  typeof (err as any)?.message === "string"
                    ? (err as any).message
                    : "An unknown error occurred";
                setErr(message);
              }
            }}
          >
            {"Test action"}
          </Button>
        </FlexRow>
        {res && <CodeBlock text={res}></CodeBlock>}
        {err && <Text>{err}</Text>}
      </FlexColumn>
    </>
  );
};
