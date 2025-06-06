"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode.react";
import { toast } from "react-hot-toast";

export default function Settings() {
  const [qrCode, setQrCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const enableMFA = async () => {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.auth.mfa.enroll({
      userId: user.user!.id,
      factorType: "totp",
    });
    if (error) {
      toast.error(error.message);
    } else {
      setQrCode(data.totp.qr_code);
    }
  };

  const verifyMFA = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors?.totp?.length) {
      toast.error("No TOTP factor found");
      return;
    }
    const factorId = factors.totp[0].id;
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      code: mfaCode,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("MFA enabled!");
      setQrCode("");
      setMfaCode("");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4">
        <h2 className="text-xl">Multi-Factor Authentication</h2>
        {!qrCode ? (
          <Button onClick={enableMFA}>Enable MFA</Button>
        ) : (
          <div className="space-y-4">
            <p>Scan this QR code with an authenticator app:</p>
            <QRCode value={qrCode} />
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
