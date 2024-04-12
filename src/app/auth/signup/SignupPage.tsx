"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { Button, Subtitle2, Title1 } from "@fluentui/react-components";
import { SignupForm } from "./SignupForm";
import { useRouter } from "next/navigation";

export default function SignupPage() {
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
          <Title1>{"Sign up for Unify SSO"}</Title1>
          <SignupForm />
          <Subtitle2>{"Already have an account?"}</Subtitle2>
          <FlexRow>
            <Button
              onClick={() => {
                router.push("/auth/login/login");
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
