import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} TradeMatey. All rights reserved. |{" "}
          <Link
            href="/privacy-policy"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link
            href="/terms"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Terms of Service
          </Link>
        </p>
      </div>
    </footer>
  );
}
