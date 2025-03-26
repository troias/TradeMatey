import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-10">
      <h1 className="text-4xl font-bold mb-4">Find a Fair Dinkum Tradie</h1>
      <p className="text-lg mb-6">
        Quick, reliable home services across Australia.
      </p>
      <Link
        href="/tradies"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Browse Tradies
      </Link>
    </div>
  );
}
