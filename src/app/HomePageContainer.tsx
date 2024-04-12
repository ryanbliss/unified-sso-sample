"use client";
import { FlexColumn, FlexRow } from "@/components/flex";
import { Button, Text, Title3 } from "@fluentui/react-components";
import { useTeamsClientContext } from "@/context-providers";
import CodeBlock from "@/components/code-block/CodeBlock";
import { useRouter } from "next/navigation";
import { useTeamsClientSSO } from "./hooks/useTeamsClientSSO";

export default function HomePageContainer() {
  const { teamsContext } = useTeamsClientContext();
  const router = useRouter();
  const {
    authError,
    token,
    authenticateWithTeamsSSO
  } = useTeamsClientSSO();

  return (
    <main>
      <FlexColumn vAlign="center" marginSpacer="small">
        <Title3>{"Auth:"}</Title3>
        {authError && <Text>{authError}</Text>}
        {token && (
          <>
            <CodeBlock text={token} />
            <FlexRow>
              <Button
                onClick={() => {
                  if (!teamsContext) return;
                  console.log("HomePageContainer: sending message");
                  let scope = "personal";
                  if (!!teamsContext.chat) {
                    scope = "chat";
                  } else if (!!teamsContext.channel) {
                    scope = "channel";
                  }
                  const threadId =
                    teamsContext.chat?.id ?? teamsContext.channel?.id;
                  fetch("/api/messages/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: token,
                    },
                    body: JSON.stringify({
                      scope,
                      threadId,
                      data: teamsContext,
                    }),
                  })
                    .then((res) => console.log(res))
                    .catch((err) => console.error(err));
                }}
              >
                {"Send message"}
              </Button>
              <Button onClick={() => {
                router.push("/api/auth/signout");
              }}>
                {"Sign out"}
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
              {"Log in"}
            </Button>
          )}
        </FlexRow>
        <Title3>{"Tab context:"}</Title3>
        {teamsContext && <CodeBlock text={JSON.stringify(teamsContext)} />}
      </FlexColumn>
    </main>
  );
}
