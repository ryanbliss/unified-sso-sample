import { isSdkError } from "@/client/utils/teams-js-utils";
import { useCallback, useEffect, useState } from "react";
import { useTeamsClientContext } from "../context-providers";

export const useTeamsClientSSO = () => {
  const [authError, setAuthError] = useState<string>();
  const [token, setToken] = useState<string>();
  const [attemptedSilentAuth, setAttemptedSilentAuth] = useState(false);

  const { client } = useTeamsClientContext();

  const setUnknownAuthError = useCallback((err: unknown, silent?: boolean) => {
    console.log("setUnknownAuthError", err);
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
  }, []);
  const authenticateWithTeamsSSO = useCallback(
    async (silent: boolean) => {
      try {
        if (!client) {
          throw new Error("Teams client not initialized");
        }
        const tokenRequest = {
          scopes: [
            "https://graph.microsoft.com/profile",
            "https://graph.microsoft.com/openid",
          ],
          account:
            client.authentication.entra.client.getActiveAccount() ?? undefined,
        };
        const token = silent
          ? await client.authentication.entra.client.acquireTokenSilent(
              tokenRequest
            )
          : await client.authentication.entra.client.acquireTokenPopup(
              tokenRequest
            );
        setToken(token.accessToken);
        return token.accessToken;
      } catch (err: unknown) {
        setUnknownAuthError(err, silent);
      } finally {
        setAttemptedSilentAuth(true);
      }
    },
    [client, setUnknownAuthError]
  );

  useEffect(() => {
    if (attemptedSilentAuth) return;
    authenticateWithTeamsSSO(true);
  }, [authenticateWithTeamsSSO, attemptedSilentAuth]);

  return {
    authenticateWithTeamsSSO,
    token,
    authError,
    silentAuthLoading: !attemptedSilentAuth,
  };
};
