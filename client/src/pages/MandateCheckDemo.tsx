import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type VerifyMandateResponse = {
  transactionId: string;
  requestUri: string;
  requestUriMethod?: string;
  _eudiTransactionId?: string;
};

export default function MandateCheckDemo() {
  const [ico, setIco] = useState('36723246'); // Predvyplníme
  const [isLoading, setIsLoading] = useState(false);
  
  // Pre EUDI tok
  const [qrData, setQrData] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  // Pre výsledok
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // === KROK 1: Mutácia na spustenie overenia (Volanie EUDI Sandboxu) ===
  const { mutate: initiateVerification } = useMutation({
    mutationFn: (companyIco: string) => {
      setIsLoading(true);
      setQrData(null);
      setTransactionId(null);
      setVerificationStatus(null);
      setVerificationResult(null);
      
      return fetch('/api/v1/verify-mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        credentials: 'include',
        body: JSON.stringify({ companyIco })
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text}`);
        }
        return res.json() as Promise<VerifyMandateResponse>;
      });
    },
    onSuccess: (data: VerifyMandateResponse) => {
      console.log("EUDI Sandbox odpovedal:", data);
      setQrData(data.requestUri);
      setTransactionId(data.transactionId);
      setIsLoading(false);
    },
    onError: (err: any) => {
      alert(`Chyba pri volaní /verify-mandate: ${err.message}`);
      setIsLoading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initiateVerification(ico);
  };

  // === KROK 2: Polling na kontrolu stavu ===
  useEffect(() => {
    if (!transactionId || verificationStatus) {
      return;
    }
    console.log(`[Polling] Začínam sledovať Transaction: ${transactionId}`);
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/verify-status/${transactionId}`, {
          headers: { 'X-API-Key': 'test-api-key' }
        });
        if (!response.ok) return;
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

  // === KROK 3: Simulačné funkcie (Opravené) ===

  // Funkcia na Base64URL enkódovanie (UTF-8 bezpečná verzia z Kroku 46)
  const base64UrlEncode = (data: object) => {
    const stringData = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(stringData)));
    return base64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  // Falošný SD-JWT token
  const createMockSdJwt = (givenName: string, familyName: string, nonce: string) => {
    const header = { alg: 'ES256', typ: 'vc+sd-jwt' };
    const payload = {
      iss: 'https://fake-issuer.example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: nonce,
      claims: {
        given_name: givenName,
        family_name: familyName,
      }
    };
    const signature = 'fake-signature-part';
    return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.${signature}`;
  };

  // Chýbajúca funkcia, ktorú volajú tlačidlá
  const simulateCallback = async (givenName: string, familyName: string, expectedIco: string) => {
    const currentIco = ico?.trim();
    if (currentIco !== expectedIco) {
      alert(`Chyba: Toto prihlásenie funguje iba pre IČO ${expectedIco}. Zadané IČO je ${currentIco}.`);
      return;
    }
    console.log(`[Simulácia] Posielam FAKE SD-JWT pre ${givenName} ${familyName}`);
    const mockVpToken = createMockSdJwt(givenName, familyName, transactionId!);
    try {
      await fetch('/api/v1/verify-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: transactionId,
          vp_token: mockVpToken 
        })
      });
    } catch (error) {
      console.error("Simulácia zlyhala:", error);
    }
  };

  // === KROK 4: Renderovanie ===
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Mandate check demo (EUDI)</CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Fáza 3: Zobrazenie výsledku */}
          {verificationStatus && (
            <div className="flex flex-col items-center gap-4">
              {verificationStatus === 'verified' ? (
                <h2 className="text-2xl font-bold text-green-600">Mandát Overený!</h2>
              ) : (
                <h2 className="text-2xl font-bold text-red-600">Mandát Neoverený!</h2>
              )}
              <pre className="p-4 bg-muted rounded-lg w-full text-left">
                {JSON.stringify(verificationResult, null, 2)}
              </pre>
              <Button onClick={() => window.location.reload()}>Skúsiť znova</Button>
            </div>
          )}

          {/* Fáza 2: Zobrazenie QR kódu a čakanie */}
          {qrData && !verificationStatus && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg font-medium">Naskenujte kód vašou EUDI Peňaženkou:</p>
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrData} size={256} />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Čaká sa na odpoveď...</p>
              <p className="text-xs text-muted-foreground">Transaction: {transactionId}</p>

              {/* Simulačné tlačidlá */}
              <div className="flex flex-col gap-4 mt-4 p-4 border border-dashed border-red-500 rounded-lg w-full">
                <p className="text-sm font-medium text-center">Testovacie prihlásenia:</p>
                <Button variant="secondary" onClick={() => simulateCallback('Ján', 'Nováček', '36723246')}>
                  Simulovať ako Ján Nováček (pre IČO 36723246)
                </Button>
                <Button variant="secondary" onClick={() => simulateCallback('Petra', 'Ambroz', '12345678')}>
                  Simulovať ako Petra Ambroz (pre IČO 12345678)
                </Button>
                {/* TODO: Pridať Andresa do storage.ts */}
                <Button variant="secondary" disabled>
                  Simulovať ako Andres Elgueta (najprv pridať do storage.ts)
                </Button>
              </div>
            </div>
          )}

          {/* Fáza 1: Zobrazenie formulára */}
          {!qrData && !verificationStatus && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ico-input">IČO firmy</Label>
                <Input
                  id="ico-input" // OPRAVA, KTORÁ CHÝBALA
                  type="text"
                  placeholder="napr. 36723246"
                  value={ico}
                  onChange={(e) => setIco(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Overiť mandát
              </Button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}