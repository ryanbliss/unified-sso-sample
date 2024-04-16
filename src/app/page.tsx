import { cookies } from "next/headers";
import HomePageContainer from "./HomePageContainer";
import { redirect } from "next/navigation";
import { validateAppToken } from "@/utils/app-auth-utils";

export default function Home() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("Authorization");
  const token = tokenCookie?.value;
  if (!token) {
    redirect(`/auth/login`);
  }
  const jwtPayload = validateAppToken(token);
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
