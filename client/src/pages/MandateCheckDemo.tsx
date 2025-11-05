import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// using fetch directly for this demo to include X-API-Key header
import { QRCodeSVG } from 'qrcode.react';

export default function MandateCheckDemo() {
  const [ico, setIco] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // === Polling state ===
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    // Spustíme polling, iba ak máme transactionId a ešte nemáme výsledok
    if (!transactionId || verificationStatus) return;

    console.log(`[Polling] Začínam sledovať Transaction: ${transactionId}`);

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/verify-status/${transactionId}`, {
          headers: {
            'X-API-Key': 'test-api-key'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          console.warn(`[Polling] Chyba pri dopyte na status: ${response.status}`);
          return; // continue polling
        }

        const data = await response.json();

        if (data.status !== 'pending') {
          console.log(`[Polling] Stav sa zmenil na: ${data.status}`, data.result);
          setVerificationStatus(data.status);
          setVerificationResult(data.result);
          clearInterval(intervalId);
        } else {
          console.log('[Polling] Stav je stále "pending"...');
        }
      } catch (error) {
        console.error('[Polling] Zlyhanie fetch:', error);
        clearInterval(intervalId);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [transactionId, verificationStatus]);

  // === Simulation helpers (for local testing) ===
  const simulateSuccess = async () => {
    console.log(`[Simulácia] Posielam ÚSPEŠNÝ callback pre ${transactionId}`);
    try {
      await fetch('/api/v1/verify-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: transactionId,
          vp_token: JSON.stringify({ given_name: 'Ján', family_name: 'Nováček' })
        })
      });
    } catch (error) {
      console.error('Simulácia zlyhala:', error);
    }
  };

  const simulateFailure = async () => {
    console.log(`[Simulácia] Posielam NEÚSPEŠNÝ callback pre ${transactionId}`);
    try {
      await fetch('/api/v1/verify-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: transactionId,
          vp_token: JSON.stringify({ given_name: 'Peter', family_name: 'Zlý' })
        })
      });
    } catch (error) {
      console.error('Simulácia zlyhala:', error);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ico.trim()) {
      setError("IČO je povinné");
      return;
    }
    setIsLoading(true);
    setError(null);
    setQrData(null);
    setTransactionId(null);

    try {
      // Use fetch directly so we can include the X-API-Key header required by our backend middleware
      const response = await fetch('/api/v1/verify-mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ companyIco: ico.trim() }),
        credentials: 'include'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

  const res = await response.json();
  // Save requestUri for QR and use localTransactionId for polling (fallback to transactionId)
  setQrData(res.requestUri);
  setTransactionId(res.localTransactionId || res.transactionId || null);
    } catch (err: any) {
      console.error('Mandate check error', err);
      setError(err?.message || 'Chyba pri volaní API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-6">Mandate check demo (EUDI)</h2>

          {!qrData && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="ico">IČO firmy</Label>
                <Input
                  id="ico"
                  type="text"
                  placeholder="napr. 36723246"
                  value={ico}
                  onChange={(e) => setIco(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" onClick={handleVerify} disabled={isLoading || !ico.trim()}>
                  {isLoading ? 'Pripravuje sa...' : 'Overiť mandát'}
                </Button>
              </div>
            </form>
          )}

          {/* Keď máme QR dáta, ale ešte nemáme výsledok */}
          {qrData && !verificationStatus && (
            <div className="flex flex-col items-center gap-4 mt-4">
              <p className="text-lg font-medium">Naskenujte kód vašou EUDI Peňaženkou:</p>
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrData} size={256} />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Čaká sa na odpoveď...</p>
              <p className="text-xs text-muted-foreground">Transaction: {transactionId}</p>

              {/* === Test buttons: simulate callback responses === */}
              <div className="flex gap-4 mt-4 p-4 border border-dashed border-red-500 rounded-lg">
                <Button variant="secondary" onClick={simulateSuccess} disabled={!transactionId}>
                  Simulovať Úspech (Ján Nováček)
                </Button>
                <Button variant="destructive" onClick={simulateFailure} disabled={!transactionId}>
                  Simulovať Zlyhanie (Peter Zlý)
                </Button>
              </div>
            </div>
          )}

          {/* Keď už máme výsledok (napr. 'verified' alebo 'not_verified') */}
          {verificationStatus && (
            <div className="flex flex-col items-center gap-4 mt-4">
              {verificationStatus === 'verified' ? (
                <h2 className="text-2xl font-bold text-green-600">Mandát Overený!</h2>
              ) : (
                <h2 className="text-2xl font-bold text-red-600">Mandát Neoverený!</h2>
              )}
              <pre className="p-4 bg-muted rounded-lg w-full text-left">{JSON.stringify(verificationResult, null, 2)}</pre>
              <Button onClick={() => window.location.reload()}>Skúsiť znova</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
