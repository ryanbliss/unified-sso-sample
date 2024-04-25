import { IUser, findAADUser, findUser, upsertUser } from "@/server/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/server/utils/app-auth-utils";
import { cookies } from "next/headers";
import { IAuthConnections } from "@/shared/models/user";
import {
  addAADConnection,
  getMSALResultForCode,
} from "@/server/utils/msal-token-utils";

/**
 * Rudimentary login implementation for illustrative purposes. Do not use in production.
 *
 * @param req request
 * @returns response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const body = await req.json();
  if (!isISignUpBody(body)) {
    throw new Error(
      "/api/auth/signup body is invalid type, must be type ILoginBody"
    );
  }
  // Check if user already exists for email
  const checkUser = await findUser(body.email);
  if (checkUser) {
    return NextResponse.json(
      {
        error: "Account already exists",
      },
      {
        status: 401,
      }
    );
  }
  let connections: IAuthConnections | undefined;
  if (body.connection === "aad") {
    const codeCookie = cookieStore.get("AADConnectionCode");
    const code = codeCookie?.value;
    if (code) {
      const msalResult = getMSALResultForCode(code);
      // Delete AADConnectionCode, if it exists
      cookieStore.delete("AADConnectionCode");
      if (!msalResult) {
        console.error(
          `/api/auth/signup: invalid msal result for code + ${code}`
        );
        return NextResponse.json(
          {
            error:
              "Cannot use connection type 'aad' without valid 'AADConnectionCode' header.",
          },
          {
            status: 400,
          }
        );
      }
      let checkMSALUser: IUser | null;
      try {
        checkMSALUser = await findAADUser(
          msalResult.account.localAccountId,
          msalResult.account.tenantId
        );
      } catch (err) {
        console.error(`/api/auth/signup: failed to lookup checkMSALUser`);
        return NextResponse.json(
          {
            error: "An internal error occurred..",
          },
          {
            status: 500,
          }
        );
      }
      if (checkMSALUser) {
        return NextResponse.json(
          {
            error: "Account already exists for this AAD identity",
          },
          {
            status: 400,
          }
        );
      }
      connections = addAADConnection(connections ?? {}, msalResult);
    } else {
      return NextResponse.json(
        {
          error:
            "Cannot use connection type 'aad' without 'AADConnectionCode' header.",
        },
        {
          status: 400,
        }
      );
    }
  }
  // Insert user into mongodb
  const user = await upsertUser({
    email: body.email,
    password: body.password,
    connections,
  });
  // Sign token and set it as a cookie
  const token = signAppToken(user, "email");
  cookieStore.set({
    name: "Authorization",
    value: token,
    sameSite: "none",
    secure: true,
  });
  return NextResponse.json({
    success: true,
  });
}

interface ISignUpBody {
  email: string;
  password: string;
  connection: "email" | "aad";
}

function isISignUpBody(value: any): value is ISignUpBody {
  return (
    value &&
    typeof value.email === "string" &&
    typeof value.password === "string" &&
    typeof value.connection === "string" &&
    ["email", "aad"].includes(value.connection)
  );
}
