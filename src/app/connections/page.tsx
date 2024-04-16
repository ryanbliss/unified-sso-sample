import { redirect } from "next/navigation";
import ConnectionsPage from "./ConnectionsPage";
import { cookies } from "next/headers";
import { validateAppToken } from "@/utils/app-auth-utils";

export default async function Connections() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("Authorization");
  const token = tokenCookie?.value;
  if (!token) {
    redirect(`/auth/login`);
  }
  // This fails because token is invalid / expired, so we clear the token and redirect to login
  const jwtPayload = validateAppToken(token);
  if (!jwtPayload) {
    redirect(`/api/auth/signout`);
  }
  return <ConnectionsPage user={jwtPayload.user} />;
}
