"use client";

import { FlexRow } from "@/components/flex";
import { Button, Input, Text, tokens } from "@fluentui/react-components";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";

export const SignupForm: FC<{}> = (props) => {
  const [email, setEmail] = useState("");
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
        }),
      });
      const body = await res.json();
      const connections: unknown = body?.connections;
      if (Array.isArray(connections)) {
        if (connections.length === 0) {
          // For this sample, we go straight to the connections page if not already connected to AAD.
          // This is where users will connect their account to Teams, if needed.
          router.push("/connections");
          return;
        }
      }
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

  return (
    <>
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
    </>
  );
};
