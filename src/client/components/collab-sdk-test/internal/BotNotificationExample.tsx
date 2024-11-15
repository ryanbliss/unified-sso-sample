import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Switch, Text } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";
import { useError } from "@/client/hooks/useError";

export const BotNotificationExample: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setErr] = useError();
  const [notifyEveryone, setNotifyEveryone] = useState<boolean>(false);
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        {client.host.page.customData && (
          <CodeBlock
            text={`Opened via deep link with custom data:\n${JSON.stringify(
              client.host.page.customData,
              null,
              4
            )}`}
          ></CodeBlock>
        )}
        <FlexRow>
          <Button
            onClick={async () => {
              try {
                const response = await client.conversation.bot.triggerAction(
                  "notify",
                  notifyEveryone
                );
                setRes(JSON.stringify(response, null, 4));
              } catch (error: unknown) {
                setErr(error);
              }
            }}
          >
            {"Send notification"}
          </Button>
          <Switch
            checked={notifyEveryone}
            label="Notify everyone"
            onChange={(_e, data) => setNotifyEveryone(data.checked)}
          />
        </FlexRow>
        {res && <CodeBlock text={res}></CodeBlock>}
        {err && <Text>{err}</Text>}
      </FlexColumn>
    </>
  );
};
