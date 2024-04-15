import {
  ConfidentialClientApplication,
  AuthenticationResult,
  AccountInfo,
} from "@azure/msal-node";
import jwt from "jsonwebtoken";
import validateTeamsToken from "./teams-token-utils";

// Creating MSAL client
export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.BOT_ID!,
    clientSecret: process.env.BOT_PASSWORD!,
  },
});

export async function exchangeTeamsTokenForMSALToken(
  teamsIdentityToken: string
): Promise<IValidatedAuthenticationResult> {
  const jwt = await validateTeamsToken(teamsIdentityToken);
  console.log(
    "msal-token-utils exchangeTeamsTokenForMSALToken: exchanging token for msal"
  );
  const scopes = ["https://graph.microsoft.com/User.Read"];
  const result = await msalClient.acquireTokenOnBehalfOf({
    authority: `https://login.microsoftonline.com/${jwt.tid}`,
    oboAssertion: teamsIdentityToken,
    scopes: scopes,
    skipCache: false,
  });
  if (!result) {
    throw new Error(
      "msal-token-utils exchangeTeamsTokenForMSALToken: result is null"
    );
  }
  console.log(
    "msal-token-utils exchangeTeamsTokenForMSALToken: ",
    JSON.stringify(result, null, 4)
  );
  if (!isIValidatedAuthenticationResult(result)) {
    throw new Error(
      "msal-token-utils exchangeTeamsTokenForMSALToken: account is null"
    );
  }
  return result;
}

export interface IValidatedAuthenticationResult extends AuthenticationResult {
  account: AccountInfo;
}

function isIValidatedAuthenticationResult(
  value: AuthenticationResult
): value is IValidatedAuthenticationResult {
  return value.account !== null;
}

export const decodeMSALToken = (token: string): jwt.JwtPayload => {
  const payload = jwt.decode(token);
  if (payload === null || typeof payload === "string") {
    throw new Error("Invalid token type");
  }
  return payload;
};
