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
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Providers>
          <Header />
          <main>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
          <Footer />
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}
