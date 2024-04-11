"use client";

import { FlexColumn } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { Title1 } from "@fluentui/react-components";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <FlexColumn expand="fill">
      <ScrollWrapper>
        <FlexColumn marginSpacer="small" style={{
            padding: "24px",
        }}>
          <Title1>{"Log in to Unify SSO"}</Title1>
          <SignupForm />
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
}
