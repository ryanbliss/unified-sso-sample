"use client";
import { useCallback, useState } from "react";
import * as teamsJs from "@microsoft/teams-js";
import { FlexColumn } from "@/components/flex";
import { Button, Text } from "@fluentui/react-components";

export default function HomePageContainer() {
  const [authError, setAuthError] = useState<string>();
  const [token, setToken] = useState<string>();
  const setUnknownAuthError = useCallback(
    (err: unknown, silent?: boolean) => {
      let prefix: string = "";
      let message: string = "An unknown error occurred";
      if (teamsJs.isSdkError(err)) {
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
          claims: ["User.Read"]
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
      <FlexColumn vAlign="center">
        {authError && <Text>{authError}</Text>}
        {token && <Text>{token}</Text>}
        {!token && (
            <Button onClick={() => {
                authenticateWithTeamsSSO(false);
            }}>
                {"Log in"}
            </Button>
        )}
      </FlexColumn>
    </main>
  );
}
