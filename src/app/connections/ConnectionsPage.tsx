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
import { useTeamsClientSSO } from "../../hooks/useTeamsClientSSO";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeamsClientContext } from "@/context-providers";
import * as teamsJs from "@microsoft/teams-js";
import { IUserPasswordless } from "@/models/user";

export default function ConnectionsPage(props: { user: IUserPasswordless }) {
  const { user } = props;
  const [loading, setLoading] = useState(false);
  const { authError, authenticateWithTeamsSSO } = useTeamsClientSSO();
  const [accountLinkError, setAccountLinkError] = useState<Error>();

  const { teamsContext } = useTeamsClientContext();

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
      const res = await fetch("/api/auth/link/teams-aad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
      });
      const body = await res.json();
      if (res.status !== 200) {
        throw new Error(body.error);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      if (err instanceof Error) {
        setAccountLinkError(err);
      }
      return;
    }
    if (teamsContext?.page?.frameContext !== teamsJs.FrameContexts.task) {
      // Redirect to home page
      router.push("/");
    } else {
      // If in a task module, we submit the task
      teamsJs.dialog.url.submit({
        success: true,
        // Teams AI library requires the verb be attached to the data field
        verb: "connect-account",
      });
      // Then we immediately call it again with no props, which closes the dialog
      teamsJs.dialog.url.submit();
    }
  };

  const unauthorizeLinkedAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/unlink/teams-aad", {
        method: "POST",
      });
      const body = await res.json();
      if (res.status !== 200) {
        throw new Error(body.error);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      if (err instanceof Error) {
        setAccountLinkError(err);
      }
      return;
    }
    // Likely to take user straight back to connections page in current implementation
    // This is fine, as it will reload the "user" prop & ensure everything is cleaned up
    router.push("/");
  };

  return (
    <ScrollWrapper>
      <FlexColumn
        marginSpacer="medium"
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
          {!loading && (
            <FlexRow>
              {!user.connections?.aad && (
                <Button onClick={authorizeAndLinkAccount}>{"Authorize"}</Button>
              )}
              {!!user.connections?.aad && (
                <Button onClick={unauthorizeLinkedAccount}>
                  {"Unauthorize"}
                </Button>
              )}
            </FlexRow>
          )}
          {loading && <Spinner />}
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
