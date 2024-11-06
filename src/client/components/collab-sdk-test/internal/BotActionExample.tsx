import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";

export const BotActionExample: FC = () => {
  const [actionRes, setActionRes] = useState<string>();
  const [actionErr, setActionErr] = useState<string>();
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        <FlexRow>
          <Button
            onClick={async () => {
              try {
                const response = await client.conversation.bot.triggerAction(
                  "some-action",
                  {
                    input: "hello world",
                  }
                );
                setActionRes(JSON.stringify(response, null, 4));
              } catch (err: unknown) {
                const message: string =
                  typeof (err as any)?.message === "string"
                    ? (err as any).message
                    : "An unknown error occurred";
                setActionErr(message);
              }
            }}
          >
            {"Test action"}
          </Button>
        </FlexRow>
        {actionRes && <CodeBlock text={actionRes}></CodeBlock>}
        {actionErr && <Text>{actionErr}</Text>}
      </FlexColumn>
    </>
  );
};
