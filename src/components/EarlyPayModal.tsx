"use client";

import React from "react";
import { Button, Card } from "@/components/ui";

export default function EarlyPayModal({
  open,
  onConfirm,
  onCancel,
  message,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-lg font-semibold">Confirm early payment</h3>
        <p className="text-sm text-gray-600 mt-2">
          {message ??
            "This milestone hasn't been requested by the tradie yet. Paying early will bypass the tradie's request."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Proceed and pay</Button>
        </div>
      </Card>
    </div>
  );
}
