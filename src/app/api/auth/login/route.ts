import { findUser } from "@/database/user";
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
  if (!isILoginBody(body)) {
    console.error("/api/auth/login body is invalid type, must be type ILoginBody");
    return NextResponse.json(
      {
        error: "/api/auth/login body is invalid type, must be type ILoginBody",
      },
      {
        status: 400,
      }
    );
  }
  const user = await findUser(body.email);
  if (!user || user.password !== body.password) {
    if (!user) {
      console.error(
        "/api/auth/login invalid login attempt, user does not exist"
      );
    } else {
      console.error(
        "/api/auth/login invalid login attempt, invalid username & password"
      );
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
