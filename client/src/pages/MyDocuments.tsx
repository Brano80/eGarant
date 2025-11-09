import { Card } from "@/components/ui/card";
import BackButton from "@/components/BackButton";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Contract as BaseContract } from "@shared/schema";
import { FileText, Loader2, BadgeCheck, Clock as BadgeClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// Definujeme typ, ktorý používa backend [cite: 31-32]
type DocumentStatus = 'Nezaradené' | 'Čaká na podpis' | 'Podpísané';
interface Contract extends BaseContract {
  displayStatus: DocumentStatus;
}

// --- Karta Dokumentu (teraz zobrazuje všetky statusy) ---
function LibraryDocumentCard({ 
  document, 
  vkIdToAddTo 
}: { 
  document: Contract,
  vkIdToAddTo: string | null 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { activeContext } = useCurrentUser();
  const ctx = activeContext ?? null;

  // Režim "Pridať do VK" je aktívny, len ak máme ID a dokument je 'Nezaradené'
  const isAddMode = !!vkIdToAddTo && document.displayStatus === 'Nezaradené';

  // Mutácia na pridanie dokumentu do VK (SKOPÍROVANÁ Z clp.txt [cite: 55-60])
  const addContractToVKMutation = useMutation({
    mutationFn: async () => {
      if (!vkIdToAddTo) throw new Error('Chýba ID virtuálnej kancelárie');
      const res = await apiRequest('POST', `/api/virtual-offices/${vkIdToAddTo}/documents`, { contractId: document.id });
      return res.json();
    },
    onSuccess: async () => {
      if (vkIdToAddTo) {
        // Invalidujeme všetko potrebné (rovnako ako clp.txt [cite: 55-57])
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(ctx) });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtualOffice(vkIdToAddTo) });
        toast({ title: "Dokument pridaný", description: "Dokument bol pridaný do Virtuálnej kancelárie." });
        setLocation(`/virtual-office/${vkIdToAddTo}`);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Chyba', description: err?.message || 'Nepodarilo sa pridať dokument.', variant: 'destructive' });
    }
  });

  return (
    <Card 
      className={`p-4 ${isAddMode ? 'cursor-pointer transition-shadow hover:shadow-md' : 'cursor-default'} ${addContractToVKMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
      data-testid={`library-doc-${document.id}`}
      onClick={() => {
        if (isAddMode) {
          addContractToVKMutation.mutate();
        }
        // Ak nie sme v addMode, karta po kliknutí (zatiaľ) nič nerobí
      }}
    >
      <div className="flex items-center justify-between space-x-4">
        {/* Ľavá strana */}
        <div className="flex items-center space-x-4 min-w-0">
          {addContractToVKMutation.isPending && (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          )}
          {!addContractToVKMutation.isPending && (
            <div className="flex-shrink-0 rounded-full bg-gray-100 p-3">
              <FileText className="h-6 w-6 text-gray-700" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-primary truncate">
              {document.title}
            </p>
            <span className="text-sm text-muted-foreground">
              Vytvorené: {new Date(document.createdAt).toLocaleDateString('sk-SK')}
            </span>
          </div>
        </div>

        {/* Pravá strana: Badge pre VŠETKY statusy (inšpirované clp.txt [cite: 60-63]) */}
        <div className="flex-shrink-0">
          {document.displayStatus === 'Nezaradené' && (
            <Badge variant="secondary">
              <FileText className="mr-2 h-4 w-4" />
              Nezaradené
            </Badge>
          )}
          {document.displayStatus === 'Čaká na podpis' && (
            <Badge variant="outline" className="text-orange-500">
              <BadgeClock className="mr-2 h-4 w-4" />
              Čaká na podpis
            </Badge>
          )}
          {document.displayStatus === 'Podpísané' && (
            <Badge variant="outline" className="text-green-600">
              <BadgeCheck className="mr-2 h-4 w-4" />
              Podpísané
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// --- Hlavný komponent stránky ---
export default function MyDocuments() {
  const [, setLocation] = useLocation();
  const { activeContext } = useCurrentUser();
  const ctx = activeContext ?? null;
  const [activeTab, setActiveTab] = useState<DocumentStatus | 'Všetky'>('Všetky');

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const vkIdToAddTo = searchParams.get('add-to-vk');

  // 1. TOTO JE HLAVNÝ ZOZNAM VŠETKÝCH DOKUMENTOV
  const { data: allDocuments, isLoading } = useQuery<Contract[]>({
    queryKey: QUERY_KEYS.contracts(ctx),
    enabled: !!ctx, 
    queryFn: () => apiRequest('GET', '/api/contracts').then(res => res.json()),
  });

  // 2. DOKUMENTY NEMAŽEME, IBA ICH FILTRUJEME PRE ZOBRAZENIE
  const filteredDocuments = allDocuments?.filter(doc => {
    // Ak sme v režime pridávania do VK, zobrazíme iba 'Nezaradené', ktoré môžeme pridať
    if (vkIdToAddTo) return doc.displayStatus === 'Nezaradené'; 
    
    // Inak filtrujeme podľa aktívneho Tabu
    if (activeTab === 'Všetky') return true;
    return doc.displayStatus === activeTab;
  }) ?? [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackButton onClick={() => setLocation(vkIdToAddTo ? `/virtual-office/${vkIdToAddTo}` : '/')} />
        
        <h2 className="text-2xl font-semibold mb-6">
          {vkIdToAddTo ? 'Vyberte dokument na pridanie' : 'Moje dokumenty (Knižnica)'}
        </h2>

        {/* 3. PRIDANIE TABOV (iba ak nie sme v 'add' režime) */}
        {!vkIdToAddTo && (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Všetky">Všetky</TabsTrigger>
              <TabsTrigger value="Nezaradené">Nezaradené</TabsTrigger>
              <TabsTrigger value="Čaká na podpis">Na podpis</TabsTrigger>
              <TabsTrigger value="Podpísané">Podpísané</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="space-y-4">
          {/* ... (Stavy načítavania a prázdny stav) ... */}
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )}

          {!isLoading && filteredDocuments.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              {vkIdToAddTo 
                ? 'Nemáte žiadne dokumenty v Knižnici, ktoré by bolo možné pridať.'
                : 'Nenašli sa žiadne dokumenty pre tento filter.'
              }
            </Card>
          )}

          {/* 4. ZOBRAZENIE FILTROVANÝCH DOKUMENTOV */}
          {!isLoading && filteredDocuments.map((doc) => (
            <LibraryDocumentCard 
              key={doc.id} 
              document={doc} 
              vkIdToAddTo={vkIdToAddTo} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}


