import { cookies } from "next/headers";
import HomePageContainer from "./HomePageContainer";
import { redirect } from "next/navigation";
import { IAppJwtToken, validateAppToken } from "@/utils/app-auth-utils";

export default async function Home() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("Authorization");
  const token = tokenCookie?.value;
  if (!token) {
    // In production apps that work outside of Teams, you'd likely want a request header/param for "redirectTo"
    // In Teams, you'd go to your Teams-specific route; out of Teams, you'd go to your normal route.
    redirect(`/auth/teams`);
  }
  let jwtPayload: IAppJwtToken | null;
  try {
    jwtPayload = validateAppToken(token);
  } catch {
    redirect(`/api/auth/signout`);
  }
  if (!jwtPayload) {
    redirect(`/api/auth/signout`);
  }
  if (!jwtPayload.user.connections?.aad) {
    redirect(`/connections`);
  }
  return (
    <main>
      <HomePageContainer />
    </main>
  );
}
