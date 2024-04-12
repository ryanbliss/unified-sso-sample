"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { LoginForm } from "./LoginForm";
import { Button, Subtitle2, Title1 } from "@fluentui/react-components";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
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
