import { redirect } from "next/navigation";
import ConnectionsPage from "./ConnectionsPage";
import { cookies } from "next/headers";
import { IAppJwtToken, validateAppToken } from "@/server/utils/app-auth-utils";

export default async function Connections() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("Authorization");
  const token = tokenCookie?.value;
  if (!token) {
    // In production apps that work outside of Teams, you'd likely want a request header/param for "redirectTo"
    // In Teams, you'd go to your Teams-specific route; out of Teams, you'd go to your normal route.
    redirect(`/auth/teams`);
  }
  // This fails because token is invalid / expired, so we clear the token and redirect to login
  let jwtPayload: IAppJwtToken | null;
  try {
    jwtPayload = validateAppToken(token);
  } catch {
    redirect(`/api/auth/signout`);
  }
  if (!jwtPayload) {
    redirect(`/api/auth/signout`);
  }
  return <ConnectionsPage user={jwtPayload.user} />;
}
