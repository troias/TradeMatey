"use client";

import React, { useState } from "react";
import OfferModal from "@/components/OfferModal";

export default function OfferButton({ tradieId }: { tradieId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Contact Tradie
      </button>
      {open && (
        <OfferModal tradieId={tradieId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
