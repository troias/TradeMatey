import dynamic from "next/dynamic";

// Dynamically load the client OfferButton inside a server-side wrapper.
const OfferButtonClient = dynamic(() => import("./OfferButton"), {
  ssr: false,
});

export default function OfferButtonServerWrapper({
  tradieId,
}: {
  tradieId: string;
}) {
  // This is a server component that renders a client component dynamically.
  return <OfferButtonClient tradieId={tradieId} />;
}
