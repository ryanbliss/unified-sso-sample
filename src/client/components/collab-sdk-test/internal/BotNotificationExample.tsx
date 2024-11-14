import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";
import { useError } from "@/client/hooks/useError";

export const BotNotificationExample: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setErr] = useError();
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        {client.host.page.customData && (
          <CodeBlock
            text={`Opened via deep link with custom data:\n${client.host.page.customData}`}
          ></CodeBlock>
        )}
        <FlexRow>
          <Button
            onClick={async () => {
              try {
                const response = await client.conversation.bot.triggerAction(
                  "notify",
                  "https://aka.ms/teamsliveshare"
                );
                setRes(JSON.stringify(response, null, 4));
              } catch (error: unknown) {
                setErr(error);
              }
            }}
          >
            {"Notify me!"}
          </Button>
        </FlexRow>
        {res && <CodeBlock text={res}></CodeBlock>}
        {err && <Text>{err}</Text>}
      </FlexColumn>
    </>
  );
};
