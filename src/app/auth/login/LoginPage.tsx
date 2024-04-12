"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { LoginForm } from "./LoginForm";
import { Button, Subtitle2, Title1 } from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { useTeamsClientSSO } from "@/app/hooks/useTeamsClientSSO";
import { LoadWrapper } from "@/components/view-wrappers";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { token, silentAuthLoading } = useTeamsClientSSO();
  const [attemptedLoginWithAADToken, setAttemptedLoginWithAADToken] =
    useState(false);
  const router = useRouter();

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
          <LoginForm />
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
