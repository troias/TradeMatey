import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Chatbot } from "@/components/ui/Chatbot";
import "./globals.css"; // Adjust path if your CSS file is elsewhere

export const metadata = {
  title: "TradeMatey - Find Trusted Tradies",
  description:
    "Post jobs, pay securely with milestones, and resolve disputes with TradeMatey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}
