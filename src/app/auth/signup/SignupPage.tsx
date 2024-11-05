"use client";

import { FlexColumn, FlexRow } from "@/client/components/flex";
import { ScrollWrapper } from "@/client/components/scroll-wrapper";
import {
  Button,
  Input,
  Subtitle2,
  Text,
  Title1,
  tokens,
} from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTeamsClientContext } from "@/client/context-providers";

interface ISignupPageProps {
  connection: "email" | "aad";
  upn?: string;
}

export default function SignupPage(props: ISignupPageProps) {
  const { connection, upn } = props;

  const { client } = useTeamsClientContext();

  const [email, setEmail] = useState(upn ?? "");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<Error>();

  const router = useRouter();

  const onSignUp = async () => {
    try {
      // Log in
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          connection,
        }),
      });
      const body = await res.json();
      if (res.status !== 200) {
        throw new Error(body.error ?? "An unknown error occurred");
      }
      client?.authentication.notifySuccess();
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

  return (
    <FlexColumn expand="fill">
      <ScrollWrapper>
        <FlexColumn
          marginSpacer="small"
          style={{
            padding: "24px",
          }}
        >
          <Title1>{"Sign up for Unify SSO"}</Title1>
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
            value={password}
            placeholder={"Password"}
            onChange={(ev, data) => {
              setPassword(data.value);
            }}
          />
          {connection === "aad" && (
            <FlexRow>
              <Text>
                {`Signing up with Microsoft AAD will allow you to log in to Unify while signed in to Microsoft Teams as ${upn}.`}
              </Text>
            </FlexRow>
          )}
          <FlexRow>
            <Button onClick={onSignUp}>{"Sign up"}</Button>
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
          <Subtitle2>{"Already have an account?"}</Subtitle2>
          <FlexRow>
            <Button
              onClick={() => {
                router.push("/auth/login");
              }}
            >
              {"Log in"}
            </Button>
          </FlexRow>
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
}
