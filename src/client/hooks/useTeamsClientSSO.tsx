import { isSdkError } from "@/client/utils/teams-js-utils";
import * as teamsJs from "@microsoft/teams-js";
import { useCallback, useEffect, useState } from "react";

export const useTeamsClientSSO = () => {
  const [authError, setAuthError] = useState<string>();
  const [token, setToken] = useState<string>();
  const [attemptedSilentAuth, setAttemptedSilentAuth] = useState(false);
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
        const token = await teamsJs.authentication.getAuthToken({
          silent,
        });
        setToken(token);
        return token;
      } catch (err: unknown) {
        setUnknownAuthError(err, silent);
      } finally {
        setAttemptedSilentAuth(true);
      }
    },
    [setUnknownAuthError]
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
