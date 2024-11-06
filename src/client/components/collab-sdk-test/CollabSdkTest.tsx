import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text, Title3 } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../flex";
import CodeBlock from "../code-block/CodeBlock";

export const CollabSdkTest: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setError] = useState<string>();
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <Title3>{"Collab SDK Test:"}</Title3>
      <FlexColumn>
        <FlexRow>
          <Button
            onClick={() => {
              try {
                const response = client.conversation.bot.triggerAction(
                  "some-action",
                  {
                    input: "hello world",
                  }
                );
                setRes(JSON.stringify(response, null, 4));
              } catch (err: unknown) {
                const message: string =
                  typeof (err as any)?.message === "string"
                    ? (err as any).message
                    : "An unknown error occurred";
                setError(message);
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
