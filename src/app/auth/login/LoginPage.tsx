"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { Button, Input, Subtitle2, Text, Title1, tokens } from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { useTeamsClientSSO } from "@/hooks/useTeamsClientSSO";
import { LoadWrapper } from "@/components/view-wrappers";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { token, silentAuthLoading } = useTeamsClientSSO();
  const [attemptedLoginWithAADToken, setAttemptedLoginWithAADToken] =
    useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<Error>();

  const router = useRouter();

  const onLogin = async () => {
    try {
      // Log in
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const body = await res.json();
      if (res.status !== 200) {
        throw new Error(body.error);
      }
      // '/' will redirect go straight to the connections page if not already connected to AAD.
      // This is where users will connect their account to Teams, if needed.
      router.push("/");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setAuthError(err);
      } else {
        setAuthError(
          new Error(
            "An unknown error occurred. Check the console logs for more information."
          )
        );
      }
    }
  };

  useEffect(() => {
    if (!token) return;
    if (attemptedLoginWithAADToken) return;
    async function attemptLoginWithAADToken() {
      try {
        const res = await fetch("/api/auth/login/teams-aad", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token!,
          },
          body: JSON.stringify({}),
        });
        const body = await res.json();
        if (res.status !== 200) {
          throw new Error(body.error);
        }
        router.push("/");
      } catch (err) {
        console.error(err);
        setAttemptedLoginWithAADToken(true);
      }
    }
    attemptLoginWithAADToken();
  }, [token, attemptedLoginWithAADToken, router]);
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
  return (
    <FlexColumn expand="fill">
      <ScrollWrapper>
        <FlexColumn
          marginSpacer="small"
          style={{
            padding: "24px",
          }}
        >
          <Title1>{"Log in to Unify SSO"}</Title1>
          <Input
            type="email"
            value={email}
            placeholder={"Email"}
            onChange={(ev, data) => {
              setEmail(data.value);
            }}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(ev, data) => {
              setPassword(data.value);
            }}
          />
          <FlexRow>
            <Button onClick={onLogin}>{"Log in"}</Button>
          </FlexRow>
          {!!authError && (
            <Text
              style={{
                color: tokens.colorPaletteRedForeground1,
              }}
            >
              {authError.message}
            </Text>
          )}
          <Subtitle2>{"Don't have an account?"}</Subtitle2>
          <FlexRow>
            <Button
              onClick={() => {
                router.push("/auth/signup");
              }}
            >
              {"Sign up"}
            </Button>
          </FlexRow>
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
}
