import type { Metadata } from "next";
import "@styles/globals.css"; // Updated to match the alias for styles
import Header from "@components/Header";

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
        <Header />
        <main className="container mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
