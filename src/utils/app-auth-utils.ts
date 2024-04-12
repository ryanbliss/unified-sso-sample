import { IUser, IUserPasswordless } from "@/database/user";
import jwt from "jsonwebtoken";

/**
 *
 * @param user user object to sign token for
 */
export function signAppToken(user: IUser, connection: "email" | "aad"): string {
  // sign with RSA SHA256
  const privateKey = process.env.APP_AUTH_PRIVATE_KEY;
  console.log("signAppToken public key", process.env.APP_AUTH_PUBLIC_KEY);
  if (!privateKey) {
    throw new Error(
      "app-auth-utils signAppToken: .env does not contain APP_AUTH_PRIVATE_KEY"
    );
  }
  const token = jwt.sign(
    {
      user: {
        _id: user._id.toString(),
        email: user.email.toString(),
        connections: user.connections,
      },
      connection,
    },
    privateKey,
    { algorithm: "RS256", expiresIn: "1d" }
  );
  return token;
}

/**
 * Util to validate whether the app token is valid. Not intended for use with AAD tokens.
 * @param token app token to validate
 * @returns jwt payload if valid, null if not
 */
export function validateAppToken(token: string): IAppJwtToken | null {
  // sign with RSA SHA256
  const privateKey = process.env.APP_AUTH_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "app-auth-utils verifyAppToken: .env does not contain APP_AUTH_PRIVATE_KEY"
    );
  }
  const decoded = jwt.verify(token, privateKey);
  if (typeof decoded === "string") {
    console.error(
      "app-auth-utils verifyAppToken: invalid decode response type of string"
    );
    return null;
  }
  if (!isIAppJwtToken(decoded)) {
    console.error(
      "app-auth-utils verifyAppToken: invalid decode response, not type IAppJwtToken"
    );
    return null;
  }
  return decoded;
}

export interface IAppJwtToken extends jwt.JwtPayload {
  user: IUserPasswordless;
  connection: "email" | "auth";
}
function isIAppJwtToken(value: jwt.JwtPayload): value is IAppJwtToken {
  return (
    value.user &&
    typeof value.user._id === "string" &&
    typeof value.user.email === "string" &&
    (!value.user.connections || typeof value.user.connections === "object") &&
    ["email", "auth"].includes(value.connection)
  );
}
