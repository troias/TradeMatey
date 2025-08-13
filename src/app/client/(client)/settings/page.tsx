"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { toast } from "react-hot-toast";

export default function Settings() {
  const supabase = createClient();
  const [qrUri, setQrUri] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const enableMFA = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) {
      toast.error(error.message);
    } else {
      if (data.type === "totp") {
        setFactorId(data.id);
        // Prefer URI for generating QR with qrcode.react
        setQrUri(data.totp.uri);
      } else {
        toast.error("Unexpected factor type returned");
      }
    }
  };

  const verifyMFA = async () => {
    let effectiveFactorId = factorId;
    if (!effectiveFactorId) {
      const { data: factors, error: listError } =
        await supabase.auth.mfa.listFactors();
      if (listError) {
        toast.error(listError.message);
        return;
      }
      if (!factors?.totp?.length) {
        toast.error("No TOTP factor found");
        return;
      }
      effectiveFactorId = factors.totp[0].id;
    }

    // Create a challenge
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: effectiveFactorId!,
      });
    if (challengeError) {
      toast.error(challengeError.message);
      return;
    }

    // Verify the challenge with the TOTP code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: effectiveFactorId!,
      challengeId: challenge.id,
      code: mfaCode,
    });
    if (verifyError) {
      toast.error(verifyError.message);
      return;
    }

    toast.success("MFA enabled!");
    setQrUri("");
    setMfaCode("");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4">
        <h2 className="text-xl">Multi-Factor Authentication</h2>
        {!qrUri ? (
          <Button onClick={enableMFA}>Enable MFA</Button>
        ) : (
          <div className="space-y-4">
            <p>Scan this QR code with an authenticator app:</p>
            <QRCode value={qrUri} />
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="mt-2 p-2 border rounded w-full"
            />
            <Button onClick={verifyMFA} className="mt-2">
              Verify
            </Button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-10 border-t pt-6">
        <h2 className="text-xl text-red-600">Delete Account</h2>
        <p className="mt-2 text-sm text-gray-200">
          Permanently delete your account and all associated data. This action
          cannot be undone. You can only delete if you have no outstanding jobs
          (pending, open, or in progress).
        </p>
        <div className="mt-4 space-y-3 max-w-md">
          <label className="block text-sm">Type DELETE to confirm</label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="p-2 border rounded w-full text-blue-900"
          />
          <Button
            onClick={async () => {
              if (confirmText !== "DELETE") {
                toast.error('Please type "DELETE" to confirm');
                return;
              }
              setDeleting(true);
              try {
                const res = await fetch("/api/account/delete", {
                  method: "POST",
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(body.error || "Failed to delete account");
                  return;
                }
                toast.success("Account deleted");
                // Best-effort sign out and redirect
                await supabase.auth.signOut();
                window.location.href = "/";
              } catch (e) {
                console.error(e);
                toast.error("Unexpected error");
              } finally {
                setDeleting(false);
              }
            }}
            className="bg-red-600 hover:bg-red-700"
            disabled={confirmText !== "DELETE" || deleting}
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
