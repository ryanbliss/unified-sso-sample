"use client";

import { FlexColumn, FlexRow } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import {
  Button,
  Card,
  Spinner,
  Text,
  Title1,
  Title3,
  tokens,
} from "@fluentui/react-components";
import { useTeamsClientSSO } from "../hooks/useTeamsClientSSO";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectionsPage() {
  const [loading, setLoading] = useState(false);
  const { authError, authenticateWithTeamsSSO } = useTeamsClientSSO();
  const [accountLinkError, setAccountLinkError] = useState<Error>();

  const router = useRouter();

  const authorizeAndLinkAccount = async () => {
    setLoading(true);
    let authToken: string | undefined;
    try {
      authToken = await authenticateWithTeamsSSO(false);
    } catch {
      setLoading(false);
      return;
    }
    if (!authToken) return;
    try {
      await fetch("/api/auth/link/teams-aad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
      });
    } catch (err) {
      setLoading(false);
      console.error(err);
      if (err instanceof Error) {
        setAccountLinkError(err);
      }
      return;
    }
    router.push("/");
  };

  return (
    <ScrollWrapper>
      <FlexColumn
        style={{
          padding: "24px",
        }}
      >
        <Title1>{"Connections"}</Title1>
        <Card>
          <FlexRow>
            <Title3>{"Microsoft 365"}</Title3>
          </FlexRow>
          <FlexRow>
            <Text>
              {
                "Connecting your account to Microsoft AAD will allow you to log in with Microsoft Teams using SSO. You should only need to do this once."
              }
            </Text>
          </FlexRow>
          {loading && (
            <FlexRow>
              <Button onClick={authorizeAndLinkAccount}>{"Authorize"}</Button>
            </FlexRow>
          )}
          {!loading && <Spinner />}
        </Card>
        {!!authError ||
          (!!accountLinkError && (
            <Text
              style={{
                color: tokens.colorPaletteRedForeground1,
              }}
            >
              {authError ?? accountLinkError?.message}
            </Text>
          ))}
      </FlexColumn>
    </ScrollWrapper>
  );
}
