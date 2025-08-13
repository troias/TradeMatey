import AcceptClient from "./view-client";

export default function AdminAcceptPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token;
  if (!token) return <div className="p-6">Missing token</div>;
  return <AcceptClient token={token} />;
}
