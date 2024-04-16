"use client";

import { FlexRow } from "@/components/flex";
import { Button, Input, Text, tokens } from "@fluentui/react-components";
import { FC, useState } from "react";
import { useRouter } from "next/navigation";

export const LoginForm: FC<{}> = (props) => {
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
        cache: 'no-store',
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
    </>
  );
};
