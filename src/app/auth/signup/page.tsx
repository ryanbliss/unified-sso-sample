import SignupPage from "./SignupPage";

interface ISignupProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Signup(props: ISignupProps) {
  let connection = props.searchParams?.["connection"] ?? "email";
  let upn = props.searchParams?.["upn"];
  if (Array.isArray(connection) || !["email", "aad"].includes(connection)) {
    console.warn(
      `/auth/signup/page.tsx: invalid connection value ${connection}`
    );
    connection = "email";
  }
  if (Array.isArray(upn)) {
    upn = undefined;
  }
  if (connection === "aad" && !upn) {
    console.warn(
      `/auth/signup/page.tsx: upn should be known if using the aad connection`
    );
  }

  return <SignupPage connection={connection as any} upn={upn} />;
}
