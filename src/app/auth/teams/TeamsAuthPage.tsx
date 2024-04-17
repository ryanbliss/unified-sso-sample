"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import {
  Button,
  Card,
  Subtitle2,
  Text,
  Title1,
  tokens,
} from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { useTeamsClientSSO } from "@/hooks/useTeamsClientSSO";
import { LoadWrapper } from "@/components/view-wrappers";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTeamsClientContext } from "@/context-providers";
import * as teamsJs from "@microsoft/teams-js";

export default function TeamsAuthPage() {
  const { teamsContext } = useTeamsClientContext();
  const { authError, token, silentAuthLoading, authenticateWithTeamsSSO } =
    useTeamsClientSSO();
  const [attemptedLoginWithAADToken, setAttemptedLoginWithAADToken] =
    useState(false);
  const [manualAuthError, setManualAuthError] = useState<Error>();
  const [ssoManualAttemptActive, setSSOManualAttemptActive] = useState(false);
  const [manualLoginActive, setManualLoginActive] = useState(false);
  const mountedRef = useRef(true);

  const router = useRouter();

  const manualAuth = useCallback(
    async (path: "signup" | "login", connection: "email" | "aad" = "email") => {
      setManualLoginActive(true);
      try {
        const url = new URL(window.location.origin + "/auth/" + path);
        url.searchParams.append("connection", connection);
        if (connection === "aad" && teamsContext?.user?.userPrincipalName) {
          url.searchParams.append("upn", teamsContext?.user?.userPrincipalName);
        }
        await teamsJs.authentication.authenticate({
          url: url.href,
        });
        router.push(`/`);
      } catch (err: unknown) {
        console.error(err);
        setManualAuthError(
          err instanceof Error ? err : new Error("An unknown error occurred")
        );
        setManualLoginActive(false);
      }
    },
    [router, teamsContext?.user?.userPrincipalName]
  );

  const attemptLoginWithAADToken = useCallback(
    async (silent: boolean) => {
      try {
        let tokenToUse = token;
        if (!tokenToUse) {
          tokenToUse = await authenticateWithTeamsSSO(silent);
        }
        if (!tokenToUse) return;
        const res = await fetch("/api/auth/login/teams-aad", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: tokenToUse,
          },
          body: JSON.stringify({}),
        });
        const body = await res.json();
        if (res.status === 401 && !silent) {
          // 401 means the token is valid but no account has this username
          // When user clicked 'continue', we manually redirect
          await manualAuth("signup", "aad");
          return;
        }
        if (res.status !== 200) {
          throw new Error(body.error);
        }
        router.push("/");
      } catch (err) {
        console.error(err);
        setAttemptedLoginWithAADToken(true);
      }
    },
    [router, token, manualAuth, authenticateWithTeamsSSO]
  );

  useEffect(() => {
    if (!token) return;
    if (attemptedLoginWithAADToken) return;

    attemptLoginWithAADToken(true);
  }, [token, attemptedLoginWithAADToken, attemptLoginWithAADToken]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (silentAuthLoading) {
    return (
      <LoadWrapper text={"Attempting to log in with Microsoft Entra ID..."} />
    );
  }
  if (token && !attemptedLoginWithAADToken) {
    return (
      <LoadWrapper
        text={"Looking for account linked to your Microsoft Entra ID..."}
      />
    );
  }
  if (ssoManualAttemptActive) {
    return <LoadWrapper text="Logging in with Microsoft EntraID..." />;
  }
  if (manualLoginActive) {
    return <LoadWrapper text="Logging in..." />;
  }
  return (
    <FlexColumn expand="fill">
      <ScrollWrapper>
        <FlexColumn
          marginSpacer="medium"
          hAlign="center"
          style={{
            padding: "24px",
          }}
        >
          <FlexColumn
            style={{
              width: "356px",
              padding: "32px",
              backgroundColor: tokens.colorNeutralBackground1,
              boxShadow: tokens.shadow8,
              borderRadius: tokens.borderRadiusXLarge,
            }}
            marginSpacer="medium"
            vAlign="center"
            hAlign="center"
          >
            <Title1 align="center">{"Let's get started"}</Title1>
            <FlexRow
              spaceBetween
              expand="horizontal"
              vAlign="center"
              marginSpacer="small"
              style={{
                borderRadius: tokens.borderRadiusLarge,
                borderStyle: "solid",
                borderWidth: tokens.strokeWidthThin,
                borderColor: tokens.colorNeutralStroke1,
                padding: "8px",
              }}
            >
              <Text weight="semibold">
                {teamsContext?.user?.userPrincipalName}
              </Text>
              <Button
                appearance="primary"
                onClick={() => {
                  setSSOManualAttemptActive(true);
                  attemptLoginWithAADToken(false).finally(() => {
                    if (!mountedRef.current) return;
                    setSSOManualAttemptActive(false);
                  });
                }}
              >
                {"Continue"}
              </Button>
            </FlexRow>
            {!!authError ||
              (!!manualAuthError && (
                <Text
                  align="center"
                  style={{
                    color: tokens.colorPaletteRedForeground1,
                  }}
                >
                  {authError ?? manualAuthError?.message}
                </Text>
              ))}
          </FlexColumn>
          <FlexColumn vAlign="center" hAlign="center" marginSpacer="small">
            <Text>{`Not ${teamsContext?.user?.userPrincipalName}?`}</Text>
            <FlexColumn hAlign="center">
              <Button
                appearance="subtle"
                onClick={() => {
                  manualAuth("login");
                }}
              >
                {"Log in with a different account"}
              </Button>
              <Text italic>{"OR"}</Text>
              <Button
                appearance="subtle"
                onClick={() => {
                  manualAuth("signup");
                }}
              >
                {"Create new account"}
              </Button>
            </FlexColumn>
          </FlexColumn>
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
}
