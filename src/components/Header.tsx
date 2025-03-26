import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-blue-600 text-white p-4">
      <nav className="container mx-auto flex justify-between">
        <Link href="/" className="text-xl font-bold">
          Tradie Connector
        </Link>
        <div>
          <Link href="/tradies" className="mr-4">
            Tradies
          </Link>
          <Link href="/book">Book Now</Link>
        </div>
      </nav>
    </header>
  );
}
