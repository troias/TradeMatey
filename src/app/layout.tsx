import type { Metadata } from "next";
import "@styles/globals.css"; // Keep your global styles
import Header from "@components/Header";
import Providers from "./providers"; // Import the Providers component

export const metadata: Metadata = {
  title: "Local Tradie Connector",
  description: "Find trusted tradies in Australia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">
        <Providers>
          {" "}
          {/* Wrap everything in SessionProvider */}
          <Header />
          <main className="container mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
