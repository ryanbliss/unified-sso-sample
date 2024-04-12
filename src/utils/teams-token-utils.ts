import jwt, { GetPublicKeyOrSecret } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
});

const getKey: GetPublicKeyOrSecret = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (!key) {
      callback(new Error("No key found"));
    } else if (err) {
      callback(err);
    } else {
      var signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

const decodeToken = (token: string): Promise<jwt.JwtPayload> => {
  return new Promise<jwt.JwtPayload>((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
      },
      (error, decoded) => {
        if (error) {
          reject(error);
        } else if (decoded) {
          if (typeof decoded === "string") {
            reject(
              new Error("Invalid token; payload is unexpected type of string")
            );
          } else {
            resolve(decoded);
          }
        } else {
          reject(new Error("Invalid token; payload is undefined"));
        }
      }
    );
  });
};

export default async function validateTeamsToken(
  token: string
): Promise<ITeamsTokenJwtPayload> {
  // Additional validation for issuer and audience can be added here
  const metadata = await decodeToken(token);
  if (!isITeamsTokenJwtPayload(metadata)) {
    throw new Error("teams-token-utils.ts validateTeamsToken: Invalid jwt.JwtPayload response");
  }
  if (metadata.aud !== process.env.BOT_ID) {
    console.log("Invalid audience", JSON.stringify(metadata));
    throw new Error("teams-token-utils.ts validateTeamsToken: Invalid AAD audience");
  }
  console.log("teams-token-utils validateTeamsToken:", JSON.stringify(metadata));
  return metadata;
}

export interface ITeamsTokenJwtPayload extends jwt.JwtPayload {
  aud: string;
  oid: string;
  tid: string;
  preferred_username: string;
}

function isITeamsTokenJwtPayload(
  value: jwt.JwtPayload
): value is ITeamsTokenJwtPayload {
  return (
    typeof value.aud === "string" &&
    typeof value.oid === "string" &&
    typeof value.tid === "string" &&
    typeof value.preferred_username === "string"
  );
}
