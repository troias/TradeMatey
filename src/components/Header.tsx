"use client";

import Link from "next/link";
import { useSession, signOut, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Header() {
  const { data: session } = useSession();
  const [clientSession, setClientSession] = useState(session);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    async function refreshSession() {
      const updatedSession = await getSession();
      setClientSession(updatedSession);
    }
    refreshSession();
  }, []);

  const dashboardLink = () => {
    if (!clientSession?.user?.role) return "/";
    switch (clientSession.user.role) {
      case "tradie":
        return "/tradie/dashboard";
      case "client":
        return "/client/dashboard";
      case "admin":
        return "/admin/dashboard";
      case "finance":
        return "/finance/dashboard";
      case "marketing":
        return "/marketing/dashboard";
      case "support":
        return "/support-group/dashboard";
      default:
        return "/";
    }
  };

  const profileLink = () => {
    if (!clientSession?.user?.role) return "/";
    switch (clientSession.user.role) {
      case "tradie":
        return "/tradie/profile";
      case "client":
        return "/client/settings";
      case "admin":
        return "/admin/settings";
      case "finance":
        return "/finance/settings";
      case "marketing":
        return "/marketing/settings";
      case "support":
        return "/support-group/settings";
      default:
        return "/";
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-lg sticky top-0 z-50">
      <nav className="container mx-auto flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2"
          aria-label="TradeMatey Home"
        >
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            TradeMatey
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/client/browse-tradies"
            className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
            aria-label="Browse Tradies"
          >
            Browse Tradies
          </Link>
          <Link
            href="/client/post-job"
            className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
            aria-label="Post a Job"
          >
            Post a Job
          </Link>
          {clientSession ? (
            <div className="flex items-center space-x-4">
              <Link
                href={dashboardLink()}
                className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                aria-label="Dashboard"
                aria-current={
                  window.location.pathname === dashboardLink()
                    ? "page"
                    : undefined
                }
              >
                Dashboard
              </Link>
              <Link
                href={profileLink()}
                className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                aria-label="Profile"
                aria-current={
                  window.location.pathname === profileLink()
                    ? "page"
                    : undefined
                }
              >
                Profile
              </Link>
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
                aria-label="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/client/login"
                className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                aria-label="Client Login"
              >
                Client Login
              </Link>
              <Link
                href="/tradie/login"
                className="bg-yellow-400 text-blue-900 font-semibold px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg shadow-md hover:bg-yellow-500 transition duration-300 ease-in-out transform hover:scale-105"
                aria-label="Tradie Login"
              >
                Tradie Login
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="md:hidden absolute top-16 right-4 w-48 bg-blue-700 rounded-lg shadow-lg p-4 space-y-4"
          >
            <Link
              href="/client/browse-tradies"
              className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Browse Tradies"
            >
              Browse Tradies
            </Link>
            <Link
              href="/client/post-job"
              className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Post a Job"
            >
              Post a Job
            </Link>
            {clientSession ? (
              <>
                <Link
                  href={dashboardLink()}
                  className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Dashboard"
                  aria-current={
                    window.location.pathname === dashboardLink()
                      ? "page"
                      : undefined
                  }
                >
                  Dashboard
                </Link>
                <Link
                  href={profileLink()}
                  className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Profile"
                  aria-current={
                    window.location.pathname === profileLink()
                      ? "page"
                      : undefined
                  }
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition duration-300 ease-in-out"
                  aria-label="Sign Out"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/client/login"
                  className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Client Login"
                >
                  Client Login
                </Link>
                <Link
                  href="/tradie/login"
                  className="block bg-yellow-400 text-blue-900 font-semibold px-3 py-1.5 rounded-lg shadow-md hover:bg-yellow-500 transition duration-300 ease-in-out"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Tradie Login"
                >
                  Tradie Login
                </Link>
              </>
            )}
          </motion.div>
        )}
      </nav>
    </header>
  );
}
