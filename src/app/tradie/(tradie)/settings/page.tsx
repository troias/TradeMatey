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

  const enableMFA = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) {
      toast.error(error.message);
    } else {
      if (data.type === "totp") {
        setFactorId(data.id);
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

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: effectiveFactorId!,
      });
    if (challengeError) {
      toast.error(challengeError.message);
      return;
    }

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
    </div>
  );
}
