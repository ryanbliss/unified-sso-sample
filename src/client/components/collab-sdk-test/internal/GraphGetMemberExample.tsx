import { useTeamsClientContext } from "@/client/context-providers";
import {
  Button,
  Input,
  InputProps,
  Label,
  Switch,
  Text,
  useId,
} from "@fluentui/react-components";
import { FC, useState } from "react";
import { FlexColumn, FlexRow } from "../../flex";
import CodeBlock from "../../code-block/CodeBlock";
import { useError } from "@/client/hooks/useError";

export const GraphGetRosterExample: FC = () => {
  const [res, setRes] = useState<string>();
  const [err, setErr] = useError();
  const [isClient, setIsClient] = useState<boolean>(false);
  const inputId = useId("get-roster-user-id-input");
  const [value, setValue] = useState("");

  const onChange: InputProps["onChange"] = (ev, data) => {
    setValue(data.value);
  };

  const { client } = useTeamsClientContext();
  if (!client) return null;
  return (
    <>
      <FlexColumn marginSpacer="small">
        <FlexColumn>
          <Label htmlFor={inputId}>user.aadObjectId</Label>
          <Input value={value} onChange={onChange} id={inputId} />
        </FlexColumn>
        <FlexRow marginSpacer="small" vAlign="center">
          <Button
            disabled={!value}
            onClick={async () => {
              try {
                const response = await client.conversation.getMember(value, {
                  requestType: isClient ? "client" : "server",
                });
                setRes(JSON.stringify(response, null, 4));
              } catch (error: unknown) {
                setErr(error);
              }
            }}
          >
            {"Get member via Graph"}
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
