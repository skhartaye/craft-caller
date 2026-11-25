import type { Metadata } from "next";
import "./globals.css";
import { CloudProvider } from "../components/cloud-workspace";
export const metadata: Metadata = {
  title: "Callcraft — AI Caller Studio",
  description:
    "Build a more thoughtful caller. Define your services, approve its answers, and practice conversations.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CloudProvider>{children}</CloudProvider>
      </body>
    </html>
  );
}
