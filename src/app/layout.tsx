import type { Metadata } from "next";
import { RootLayoutContainer } from "./RootLayoutContainer";

export const metadata: Metadata = {
  title: "Unify",
  description: "Teams sample with unified SSO between bot and tab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RootLayoutContainer>{children}</RootLayoutContainer>
      </body>
    </html>
  );
}
