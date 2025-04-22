"use client";

import Link from "next/link";
import { useSession, signOut, getSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [clientSession, setClientSession] = useState(session);

  useEffect(() => {
    async function refreshSession() {
      const updatedSession = await getSession();
      setClientSession(updatedSession);
    }
    refreshSession();
  }, []);

  return (
    <header className="bg-blue-600 text-white p-4">
      <nav className="container mx-auto flex justify-between">
        <Link href="/" className="text-xl font-bold">
          Local Tradie Connector
        </Link>
        <div>
          <Link href="/tradies" className="mr-4">
            Tradies
          </Link>
          <Link href="/book" className="mr-4">
            Book Now
          </Link>
          {clientSession ? (
            <>
              <Link href="/profile" className="mr-4">
                Profile
              </Link>
              <button onClick={() => signOut()} className="text-white">
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/auth/signin">Sign In</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
