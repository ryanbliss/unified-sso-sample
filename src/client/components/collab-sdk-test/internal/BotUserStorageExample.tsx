import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text } from "@fluentui/react-components";
import { FC, useEffect, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";
import { useError } from "@/client/hooks/useError";

export const BotUserStorageExample: FC = () => {
  const { client } = useTeamsClientContext();
  const count = client?.conversation.bot.storage.user.get<number | undefined>("count") ?? 0;
  const [res, setRes] = useState<string>(`key: count\nvalue: ${count}`);
  const [err, setErr] = useError();

  useEffect(() => {
    const listener = (key: string, value: any) => {
      setRes(`key: ${key}\nvalue: ${JSON.stringify(value, null, 4)}`);
    };
    client?.conversation.bot.storage.user.on("valueChanged", listener);
    return () => {
      client?.conversation.bot.storage.user.off("valueChanged", listener);
    };
  }, [client]);

  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        <FlexRow>
          <Button
            onClick={async () => {
              try {
                const currentValue =
                  client.conversation.bot.storage.user.get<number | undefined>(
                    "count"
                  ) ?? 0;
                await client.conversation.bot.storage.user.set(
                  "count",
                  currentValue + 1
                );
              } catch (error: unknown) {
                setErr(error);
              }
            }}
          >
            {"Set user value +1"}
          </Button>
        </FlexRow>
        {res && <CodeBlock text={res}></CodeBlock>}
        {err && <Text>{err}</Text>}
      </FlexColumn>
    </>
  );
};
