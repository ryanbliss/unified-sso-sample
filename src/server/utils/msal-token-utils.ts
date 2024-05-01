import {
  ConfidentialClientApplication,
  AuthenticationResult,
  AccountInfo,
} from "@azure/msal-node";
import jwt from "jsonwebtoken";
import validateTeamsToken from "./teams-token-utils";
import { randomBytes } from "crypto";
import { IAuthConnections } from "@/shared/models/user";
import { getFeatureFlag } from "@/server/database/feature-flags";
import { isStringList } from "./generic-type-guards";

export async function exchangeTeamsTokenForMSALToken(
  teamsIdentityToken: string
): Promise<IValidatedAuthenticationResult> {
  // Validate the Teams token and get the jwt payload
  const jwt = await validateTeamsToken(teamsIdentityToken);
  console.log(
    "msal-token-utils exchangeTeamsTokenForMSALToken: exchanging token for msal"
  );
  // Uncomment if you'd rather hardcode the scopes
  // I chose to use feature flags for easier testing
  // const scopes = [
  //   "https://graph.microsoft.com/profile",
  //   "https://graph.microsoft.com/openid",
  // ];
  const scopes = await getFeatureFlag("scopes");
  if (!isStringList(scopes)) {
    throw new Error(
      "msal-token-utils exchangeTeamsTokenForMSALToken: Invalid scopes feature flag"
    );
  }
  // Creating MSAL client
  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.BOT_ID!,
      clientSecret: process.env.BOT_PASSWORD!,
    },
  });
  const result = await msalClient.acquireTokenOnBehalfOf({
    authority: `https://login.microsoftonline.com/${jwt.tid}`,
    oboAssertion: teamsIdentityToken,
    scopes: scopes,
    skipCache: true,
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

export function decodeMSALToken(token: string): jwt.JwtPayload {
  const payload = jwt.decode(token);
  if (payload === null || typeof payload === "string") {
    throw new Error("Invalid token type");
  }
  return payload;
}

// Temp token storage for MSAL tokens.
// This is used for users signing up with the `aad` connection.
const tempTokens = new Map<string, IValidatedAuthenticationResult>();

/**
 * Function that stores a token in a local cache.
 * This is used for users signing up with the `aad` connection.
 *
 * @param result validated MSAL token reesult, which we will cache temporarily
 * @returns the exchange code
 */
export function cacheMSALResultWithCode(
  result: IValidatedAuthenticationResult
): string {
  // Generate cryptographically secure random string
  const code = generateAuthCode(124);
  tempTokens.set(code, result);
  return code;
}

/**
 * Exchange a code for an MSAL result.
 * This is used for users signing up with the `aad` connection.
 *
 * @param code authorization code
 * @returns validated MSAL authentication result
 */
export function getMSALResultForCode(
  code: string
): IValidatedAuthenticationResult | undefined {
  const result = tempTokens.get(code);
  // Delete the token from the cache so that it can't be used again
  tempTokens.delete(code);
  return result;
}

export function addAADConnection(
  connections: IAuthConnections,
  msalResult: IValidatedAuthenticationResult
): IAuthConnections {
  const newConnections = {
    ...connections,
    aad: {
      oid: msalResult.account.localAccountId,
      tid: msalResult.account.tenantId,
      upn: msalResult.account.username,
    },
  };
  return newConnections;
}

/**
 *
 * @param length
 * @returns random string
 */
function generateAuthCode(length: number): string {
  // Generate a random byte array
  const buffer = randomBytes(length);

  // Convert byte array to hexadecimal format for easy use as a string
  // and slice it to the required length in case of any length mismatches due to conversion.
  return buffer.toString("hex").slice(0, length);
}
