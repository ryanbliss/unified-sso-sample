"use client";

import { FlexRow } from "@/components/flex";
import { Button, Input, Title1 } from "@fluentui/react-components";
import { FC, useState } from "react";
import { useRouter } from "next/navigation";

export const LoginForm: FC<{}> = (props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  return (
    <>
      <Title1>{"Log in to Unify SSO"}</Title1>
      <Input
        type="email"
        value={email}
        onChange={(ev, data) => {
          setEmail(data.value);
        }}
      />
      <Input
        type="password"
        value={password}
        onChange={(ev, data) => {
          setPassword(data.value);
        }}
      />
      <FlexRow>
        <Button
          onClick={async () => {
            // Log in
            await fetch("/api/auth/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email,
                password,
              }),
            });
            router.push("/");
          }}
        >
          {"Log in"}
        </Button>
      </FlexRow>
    </>
  );
};
