import { findUser } from "@/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/utils/app-auth-utils";
import { cookies } from "next/headers";

/**
 * Rudimentary login implementation for illustrative purposes. Do not use in production.
 * 
 * @param req request
 * @returns response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  if (!isILoginBody(body)) {
    throw new Error(
      "/api/auth/login body is invalid type, must be type ILoginBody"
    );
  }
  const user = await findUser(body.email);
  if (!user || user.password !== body.password) {
    if (!user) {
        console.error("/api/auth/login invalid login attempt, user does not exist");
    } else {
        console.error("/api/auth/login invalid login attempt, invalid username & password");
    }
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const response = NextResponse.json({
    success: true
  });
  const token = signAppToken(user, "email");
  cookies().set("Authorization", token);
  return response;
}

interface ILoginBody {
  email: string;
  password: string;
}

function isILoginBody(value: any): value is ILoginBody {
  return (
    value &&
    typeof value.email === "string" &&
    typeof value.password === "string"
  );
}
