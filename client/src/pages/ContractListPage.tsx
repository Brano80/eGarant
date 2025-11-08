import { apiRequest } from '@/lib/queryClient';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import type { Contract } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Plus, BadgeCheck, Clock as BadgeClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

export function ContractListPage() {
  const { data: currentUser, activeContext } = useCurrentUser();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const queryClient = useQueryClient();
  // OPRAVA: Čítame priamo z 'window.location.search' pre spoľahlivé čítanie query paramov
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const vkIdToAddTo = searchParams.get('add-to-vk');
  // (no debug logging)

  // Získame aj activeContext
  // 1. Načítame zmluvy pre aktuálne prihláseného používateľa v závislosti od kontextu
  const { data: contracts, isLoading } = useQuery<Contract[]>({
    // Použijeme nový kľúč závislý od kontextu (normalizujeme undefined -> null)
    queryKey: QUERY_KEYS.contracts(activeContext ?? null),
    // queryFn: volanie na endpoint bez query param (server použije session.activeContext)
    queryFn: () => apiRequest('GET', '/api/contracts').then(res => res.json()),
    // Dotaz sa má spustiť, hneď ako máme načítaného používateľa
    // (a teda vieme, či je jeho kontext 'null' alebo ID mandátu)
    enabled: !!currentUser,
  });

  // (No parent-level add mutation any more; the card will handle adding when vkIdToAddTo is present)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {/* Hlavička s navigáciou */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Späť na menu
        </Link>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Vytvoriť novú zmluvu
        </Button>
      </div>

      {/* Názov stránky */}
      <h1 className="text-3xl font-bold tracking-tight mb-6">Moje zmluvy</h1>

      {/* add-to-vk mode: no debug banner shown */}

      {/* Zoznam zmlúv */}
      <div className="space-y-4">
        {!contracts || contracts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Zatiaľ nemáte vytvorené žiadne zmluvy.</p>
        ) : (
          contracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} onPreview={setSelectedContract} vkIdToAddTo={vkIdToAddTo} />
          ))
        )}
      </div>

          {/* === KÓD PRE NÁHĽAD ZMLUVY (MODÁL) === */}
          <Dialog open={!!selectedContract} onOpenChange={(isOpen) => !isOpen && setSelectedContract(null)}>
            <DialogContent className="max-w-4xl p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-bold">{selectedContract?.title}</DialogTitle>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Zavrieť</span>
                </DialogClose>
              </DialogHeader>
              <div className="p-6 border-t">
                {selectedContract && (
                  <div className="space-y-6">
                    <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
                      {selectedContract.title}
                    </h2>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">SPLNOMOCNITEĽ:</h3>
                        <div className="space-y-1">
                          <p>Ján Nováček</p>
                          <p>Rodné číslo: 880215/1234</p>
                          <p>Adresa: Masarykova 456, 602 00 Brno, Česká republika</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">SPLNOMOCNENEC:</h3>
                        <div className="space-y-1">
                          <p>Petra Ambroz</p>
                          <p>Rodné číslo: 920308/5678</p>
                          <p>Adresa: Hlavná 25, 811 01 Bratislava, Slovensko</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-2">ROZSAH SPLNOMOCNENIA:</h3>
                      <div className="bg-muted p-4 rounded-md text-muted-foreground">
                        <p>Zastupovanie na úradoch, podpisovanie dokumentov, prevzatie korešpondencie</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-2">PLATNOSŤ:</h3>
                      <p>Od: {new Date(selectedContract.createdAt).toLocaleDateString('sk-SK')}</p>
                      <p>Do: odvolania</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 pt-6 border-t mt-8">
                      <p>V Bratislave, dňa {new Date(selectedContract.createdAt).toLocaleDateString('sk-SK')}</p>
                      <p>V Bratislave, dňa {new Date(selectedContract.createdAt).toLocaleDateString('sk-SK')}</p>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
}

// Pomocný komponent pre Kartu Zmluvy
function ContractCard({ contract, onPreview, vkIdToAddTo }: { contract: Contract, onPreview: (contract: Contract) => void, vkIdToAddTo: string | null }) {
  const isPending = contract.status === 'pending';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation(); // redirect after success

  const addContractToVKMutation = useMutation({
    mutationFn: async () => {
      if (!vkIdToAddTo) throw new Error('No virtual office id provided');
      const res = await apiRequest('POST', `/api/virtual-offices/${vkIdToAddTo}/documents`, { contractId: contract.id });
      return res.json();
    },
    onSuccess: async () => {
      if (vkIdToAddTo) {
        // Obnovíme dáta pre VK, do ktorej ideme
        await queryClient.refetchQueries({ queryKey: QUERY_KEYS.virtualOffice(vkIdToAddTo) });

        // OBNOVÍME AJ DASHBOARD (TOTO JE NOVÁ OPRAVA)
        await queryClient.refetchQueries({ queryKey: ['/api/dashboard/summary'] });

        // Až potom presmerujeme
        setLocation(`/virtual-office/${vkIdToAddTo}`);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Chyba', description: err?.message || 'Nepodarilo sa pridať zmluvu.', variant: 'destructive' });
    }
  });

  return (
    <div 
      className={`bg-card border rounded-lg p-4 flex items-center justify-between shadow-sm 
        ${vkIdToAddTo ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
        ${addContractToVKMutation.isPending ? 'pointer-events-none opacity-60' : ''}
      `}
          onClick={() => {
        // Spusti mutáciu, IBA ak sme v 'add' režime
        if (vkIdToAddTo) {
          addContractToVKMutation.mutate();
        }
      }}
          // Zabráníme kliknutiu na kartu vizuálne cez CSS (pointer-events-none) pri prebiehajúcej mutácii
    >
      <div>
        <h3 className="text-lg font-semibold">{contract.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Vytvorené: {new Date(contract.createdAt).toLocaleDateString('sk-SK')}
        </p>
        <p className="text-sm text-muted-foreground">
          Typ: {contract.type}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        {isPending ? (
          <Badge variant="outline" className="text-orange-500">
            <BadgeClock className="mr-2 h-4 w-4" />
            Čaká na podpis
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-600">
            <BadgeCheck className="mr-2 h-4 w-4" />
            Podpísané
          </Badge>
        )}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPreview(contract); }}
          >
            Zobraziť
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ContractListPage;
