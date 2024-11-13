import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Switch, Text } from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";
import { useError } from "@/client/hooks/useError";

export const GraphGetMembersExample: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setErr] = useError();
  const [isClient, setIsClient] = useState<boolean>(false);
  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        <FlexRow marginSpacer="small" vAlign="center">
          <Button
            onClick={async () => {
              try {
                const response = await client.conversation.getMembers({
                  requestType: isClient ? "client" : "server",
                });
                setRes(JSON.stringify(response, null, 4));
              } catch (error: unknown) {
                setErr(error);
              }
            }}
          >
            {"Get members via Graph"}
          </Button>
          <Switch
            checked={isClient}
            label="Use Graph NAA"
            onChange={(_e, data) => setIsClient(data.checked)}
          />
        </FlexRow>
        {res && <CodeBlock text={res}></CodeBlock>}
        {err && <Text>{err}</Text>}
      </FlexColumn>
    </>
  );
};
