"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/Providers";
import { FaBars, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Header() {
  const { user, role, signOut, setRole, userRoles } = useAuth();
  const session = user ? { user: { id: user.id, role } } : null;

  // console.log("Header session (auth ctx):", session);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dashboardLink = () => {
    // Prefer active role; fallback to first available role from context
    const activeRole = session?.user?.role || (userRoles?.[0] ?? null);
    if (!activeRole) return "/";
    switch (activeRole) {
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
    const activeRole = session?.user?.role || (userRoles?.[0] ?? null);
    if (!activeRole) return "/";
    switch (activeRole) {
      case "tradie":
        return "/tradie/profile";
      case "client":
        return "/client/account";
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
          {session ? (
            <>
              {/* Role Switcher Dropdown for multi-role users */}
              {userRoles && userRoles.length > 1 && (
                <select
                  value={role ?? userRoles[0] ?? "tradie"}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-white text-blue-900 px-2 py-1 rounded border border-gray-300 mr-4"
                  aria-label="Switch Role"
                >
                  {Array.from(new Set(userRoles)).map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              )}
              {/* Show tradie links only when active role is tradie, or single tradie role */}
              {userRoles &&
                userRoles.includes("tradie") &&
                (role === "tradie" || (userRoles.length === 1 && !role)) && (
                  <>
                    <Link
                      href="/tradie/jobs"
                      className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                      aria-label="Browse Client Jobs"
                    >
                      Browse Jobs
                    </Link>
                    <Link
                      href="/tradie/dashboard"
                      className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                      aria-label="Tradie Dashboard"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/tradie/profile"
                      className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                      aria-label="Tradie Profile"
                    >
                      Account
                    </Link>
                  </>
                )}
              {userRoles &&
                userRoles.includes("client") &&
                (role === "client" || (userRoles.length === 1 && !role)) && (
                  <>
                    {/* Prompt to choose role when multiple roles and none active */}
                    {userRoles && userRoles.length > 1 && !role && (
                      <Link
                        href="/select-role"
                        className="text-base bg-white/10 px-3 py-1.5 rounded hover:bg-white/20"
                      >
                        Choose role
                      </Link>
                    )}
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
                    <Link
                      href="/client/dashboard"
                      className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                      aria-label="Client Dashboard"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/client/account"
                      className="text-base hover:text-yellow-300 transition duration-300 ease-in-out"
                      aria-label="Client Account"
                    >
                      Account
                    </Link>
                  </>
                )}
              {/* Add other roles as needed */}
              <button
                onClick={() => signOut("/")}
                className="bg-red-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
                aria-label="Sign Out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
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
            </>
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
            {session ? (
              <>
                {userRoles?.includes("tradie") &&
                  (role === "tradie" || !role) && (
                    <Link
                      href="/tradie/jobs"
                      className="block text-white hover:text-yellow-300 transition duration-300 ease-in-out"
                      onClick={() => setIsMenuOpen(false)}
                      aria-label="Browse Client Jobs"
                      aria-current={
                        typeof window !== "undefined" &&
                        window.location.pathname === "/tradie/jobs"
                          ? "page"
                          : undefined
                      }
                    >
                      Browse Jobs
                    </Link>
                  )}
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
                    signOut("/");
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
