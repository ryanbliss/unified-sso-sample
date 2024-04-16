import { findUser, upsertUser } from "@/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/utils/app-auth-utils";

/**
 * Rudimentary login implementation for illustrative purposes. Do not use in production.
 *
 * @param req request
 * @returns response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
  // Insert user into mongodb
  const user = await upsertUser({
    email: body.email,
    password: body.password,
  });
  // Sign token and set it as a cookie
  const token = signAppToken(user, "email");
  const connections: string[] = [];
  if (user.connections?.aad) {
    connections.push("aad");
  }
  const response = NextResponse.json({
    success: true,
    connections,
  });
  response.cookies.set({
    name: "Authorization",
    value: token,
    sameSite: "none",
    secure: true,
  });
  return response;
}

interface ISignUpBody {
  email: string;
  password: string;
}

function isISignUpBody(value: any): value is ISignUpBody {
  return (
    value &&
    typeof value.email === "string" &&
    typeof value.password === "string"
  );
}
