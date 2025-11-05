import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/BackButton";
import { FileText, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";

// 1. Definujeme typ pre uloženú doložku
interface SavedAttestation {
  id: string; // ID samotného záznamu doložky
  documentId: string; // ID pôvodného dokumentu (pre preklik na detail)
  documentTitle: string;
  createdAt: string; // Dátum uloženia
}

// 2. Vytvoríme mock dáta (nahradíme reálnym API volaním neskôr)
const MOCK_ATTESTATIONS: SavedAttestation[] = [
  {
    id: 'attest-1',
    documentId: 'doc-abc-123',
    documentTitle: 'Nájomná zmluva - Byt Stromová',
    createdAt: '2025-11-04T14:30:00Z',
  },
  {
    id: 'attest-2',
    documentId: 'doc-xyz-789',
    documentTitle: 'Splnomocnenie - Predaj vozidla',
    createdAt: '2025-10-28T09:15:00Z',
  },
];

// --- Funkcia na formátovanie dátumu (pomocná) ---
function formatAttestationDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return 'Neplatný dátum';
  }
}

// 3. Hlavný komponent stránky
export default function MyDocuments() {
  const [, setLocation] = useLocation();

  // 4. Pripravíme useQuery, ktoré zatiaľ vracia mock dáta
  const { data: attestations, isLoading } = useQuery<SavedAttestation[]>({
    // Použijeme query kľúč z knižnice QUERY_KEYS
    queryKey: QUERY_KEYS.attestations(),

    // Aktivujeme reálne volanie API
    queryFn: () => apiRequest('GET', '/api/attestations').then(res => res.json()),
  });

  // 5. Funkcia pre tlačidlo "Zobraziť"
  const handleViewAttestation = (documentId: string) => {
    // Presmerujeme na existujúcu stránku doložky
    setLocation(`/attestation/${documentId}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackButton onClick={() => setLocation('/')} />
        <h2 className="text-2xl font-semibold mb-6">E-dokumenty (Archív doložiek)</h2>

        <div className="space-y-4">
          {/* 6. Stav načítavania (Skeleton) */}
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )}

          {/* 7. Prázdny stav */}
          {!isLoading && (!attestations || attestations.length === 0) && (
            <Card className="p-8 text-center text-muted-foreground">
              Váš archív doložiek je zatiaľ prázdny.
            </Card>
          )}

          {/* 8. Zoznam kariet doložiek */}
          {!isLoading &&
            attestations &&
            attestations.map((attestation) => (
              <Card
                key={attestation.id}
                className="p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between space-x-4">
                  {/* Ľavá strana: Ikona a texty */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
                      <FileText className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-blue-700">
                        DOLOŽKA
                      </span>
                      <span className="text-base font-semibold text-primary">
                        {attestation.documentTitle}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Vytvorené: {formatAttestationDate(attestation.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Pravá strana: Tlačidlo */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAttestation(attestation.documentId)}
                  >
                    Zobraziť
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
