import { useTeamsClientSSO } from "@/client/hooks/useTeamsClientSSO";
import { useTeamsClientContext } from "@/client/context-providers";
import { Button, Text, Title3 } from "@fluentui/react-components";
import { FC } from "react";
import CodeBlock from "../code-block/CodeBlock";
import { FlexRow } from "../flex";
import { useRouter } from "next/navigation";

export const DebugInfo: FC = ({}) => {
  const { client } = useTeamsClientContext();
  const { authError, token, authenticateWithTeamsSSO } = useTeamsClientSSO();
  const router = useRouter();
  return (
    <>
      <Title3>{"Auth:"}</Title3>
      {authError && <Text>{authError}</Text>}
      {token && (
        <>
          <CodeBlock text={token} />
          <FlexRow>
            <Button
              onClick={() => {
                if (!client) return;
                console.log("HomePageContainer: sending message");
                let scope = client.conversation.type;
                const threadId = client.conversation.id;
                fetch("/api/messages/send", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                  },
                  body: JSON.stringify({
                    scope,
                    threadId,
                    data: client.host.teamsJsContext,
                  }),
                })
                  .then((res) => console.log(res))
                  .catch((err) => console.error(err));
              }}
            >
              {"Send message"}
            </Button>
          </FlexRow>
        </>
      )}
      <FlexRow>
        {!token && (
          <Button
            onClick={() => {
              authenticateWithTeamsSSO(false);
            }}
          >
            {"Log in with Teams SSO"}
          </Button>
        )}
      </FlexRow>
      <Title3>{"Connections"}</Title3>
      <FlexRow>
        <Button
          onClick={() => {
            router.push("/connections");
          }}
        >
          {"Go to connections"}
        </Button>
      </FlexRow>
      <Title3>{"Tab context:"}</Title3>
      {client && (
        <CodeBlock text={JSON.stringify(client.host.teamsJsContext, null, 4)} />
      )}
    </>
  );
};
