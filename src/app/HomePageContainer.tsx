"use client";
import { useCallback, useState } from "react";
import * as teamsJs from "@microsoft/teams-js";
import { FlexColumn, FlexRow } from "@/components/flex";
import { Button, Text, Title3 } from "@fluentui/react-components";
import { isSdkError } from "@/utils/teams-js-type-guards";
import { useTeamsClientContext } from "@/context-providers";
import CodeBlock from "@/components/code-block/CodeBlock";

export default function HomePageContainer() {
  const [authError, setAuthError] = useState<string>();
  const [token, setToken] = useState<string>();
  const { teamsContext } = useTeamsClientContext();
  const setUnknownAuthError = useCallback(
    (err: unknown, silent?: boolean) => {
      let prefix: string = "";
      let message: string = "An unknown error occurred";
      if (isSdkError(err)) {
        prefix = `[${err.errorCode}] `;
        message = err.message ?? "undefined";
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      if (["CancelledByUser", "resourceRequiresConsent"].includes(message)) {
        return;
      }
      if (message === "FailedToOpenWindow") {
        if (silent) return;
        message =
          "Browser blocked opening authentication page in a pop-out window. Ensure pop-out windows are enabled in your browser.";
      }
      setAuthError(prefix + message);
    },
    [setAuthError]
  );
  const authenticateWithTeamsSSO = useCallback(
    async (silent: boolean) => {
      try {
        const token = await teamsJs.authentication.getAuthToken({
          silent,
        });
        setToken(token);
      } catch (err: unknown) {
        setUnknownAuthError(err, silent);
      }
    },
    [setUnknownAuthError]
  );

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
