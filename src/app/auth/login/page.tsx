import { redirect } from "next/navigation";
import LoginPage from "./LoginPage";

interface ILoginProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Login(props: ILoginProps) {
  let connection = props.searchParams?.['connection'] ?? "email";
  const upn = props.searchParams?.['upn'];
  if (Array.isArray(connection) || !["email", "aad"].includes(connection)) {
    console.warn(`/auth/login/page.tsx: invalid connection value ${connection}`);
    connection = "email";
  }
  if (connection === "aad") {
    console.warn(`/auth/login/page.tsx: should not be at login page with connection type of aad ${connection}`);
    redirect(`/auth/signup?connection=${connection}&upn=${upn}`);
  }
  return (
    <LoginPage />
  );
}
