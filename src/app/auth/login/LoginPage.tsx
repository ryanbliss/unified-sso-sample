"use client";

import { FlexColumn } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <FlexColumn expand="fill">
      <ScrollWrapper>
        <FlexColumn marginSpacer="small" style={{
            padding: "24px",
        }}>
          <LoginForm />
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
}
