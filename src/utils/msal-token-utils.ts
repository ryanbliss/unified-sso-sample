import {
  ConfidentialClientApplication,
  AuthenticationResult,
  AccountInfo,
} from "@azure/msal-node";
import validateTeamsToken from "./teams-token-utils";

// Creating MSAL client
export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.BOT_ID!,
    clientSecret: process.env.BOT_PASSWORD!,
  },
});

export async function exchangeTeamsTokenForMSAToken(
  teamsIdentityToken: string
): Promise<IValidatedAuthenticationResult> {
  const jwt = await validateTeamsToken(teamsIdentityToken);
  console.log("msal-token-utils exchangeTeamsTokenForMSAToken: exchanging token for msal");
  const scopes = ["https://graph.microsoft.com/User.Read"];
  const result = await msalClient.acquireTokenOnBehalfOf({
    authority: `https://login.microsoftonline.com/${jwt.tid}`,
    oboAssertion: teamsIdentityToken,
    scopes: scopes,
    skipCache: false,
  });
  if (!result) {
    throw new Error(
      "msal-token-utils exchangeTeamsTokenForMSAToken: result is null"
    );
  }
  if (!isIValidatedAuthenticationResult(result)) {
    throw new Error(
      "msal-token-utils exchangeTeamsTokenForMSAToken: account is null"
    );
  }
  console.log("msal-token-utils exchangeTeamsTokenForMSAToken: ", JSON.stringify(result, null, 4));
  return result;
}

export interface IValidatedAuthenticationResult extends AuthenticationResult {
  account: AccountInfo;
}

function isIValidatedAuthenticationResult(value: AuthenticationResult): value is IValidatedAuthenticationResult {
    return value.account !== null;
}
