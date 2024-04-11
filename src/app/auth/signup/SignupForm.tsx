"use client";

import { FlexRow } from "@/components/flex";
import { Button, Input } from "@fluentui/react-components";
import { useRouter } from 'next/navigation';
import { FC, useState } from "react";

export const SignupForm: FC<{}> = (props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  return (
    <>
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
            await fetch("/api/auth/signup", {
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
          {"Sign up"}
        </Button>
      </FlexRow>
    </>
  );
};
