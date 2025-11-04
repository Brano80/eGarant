import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS as queryKeys } from "@/lib/queryKeys"; // ensure we import the centralized keys
import type { VirtualOffice } from "@shared/schema";

interface VirtualOfficeEnriched extends VirtualOffice {
  participants?: any[];
  documents?: any[];
}

interface CurrentUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  mandates: Array<{
    ico: string;
    companyName: string;
    role: string;
  }>;
  activeContext: string | null;
}

const getStatusDisplay = (status: string): { text: string; className: string } => {
  switch (status) {
    case 'active':
      return { text: 'Aktívna', className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' };
    case 'pending':
      return { text: 'Čaká', className: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' };
    case 'completed':
      return { text: 'Dokončená', className: 'bg-chart-2/20 text-chart-2' };
    default:
      return { text: 'Aktívna', className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' };
  }
};

export default function VirtualOfficeListPage() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [officeName, setOfficeName] = useState('');

  // Get current user data with context
  const { data: userData, isLoading: isUserLoading } = useQuery<CurrentUserResponse>({
    queryKey: ['/api/current-user'],
  });

  // Fetch virtual offices for the current user
  const { data: offices, isLoading: isOfficesLoading } = useQuery<VirtualOfficeEnriched[]>({
    queryKey: queryKeys.virtualOffices(),
    enabled: !!currentUser,
  });

  // React Query client hook
  const queryClient = useQueryClient();

  // Create virtual office mutation
  const createOfficeMutation = useMutation({
    mutationFn: async (data: { name: string; ownerCompanyId: string | null }) => {
      const response = await apiRequest("POST", "/api/virtual-offices", data);
      return response.json();
    },
    onSuccess: (data) => {
      // invalidate virtual offices so list refreshes
      queryClient.invalidateQueries({ queryKey: queryKeys.virtualOffices() });
      setShowCreateDialog(false);
      setOfficeName('');
      // Navigate to detail
      setLocation(`/virtual-office/${data.id}`);
    },
  });

  const handleCreateOffice = () => {
    if (!officeName.trim()) {
      return;
    }

    // Get ownerCompanyId from active context
    // For personal context, send null; for company context, send the mandate ID
    const ownerCompanyId = userData?.activeContext === 'personal' ? null : userData?.activeContext || null;

    createOfficeMutation.mutate({
      name: officeName,
      ownerCompanyId,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtuálne kancelárie</h1>
          <p className="text-muted-foreground mt-1">
            Spravujte virtuálne kancelárie pre digitálne podpisovanie dokumentov
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-office"
        >
          <Plus className="mr-2 h-4 w-4" />
          Vytvoriť kanceláriu
        </Button>
      </div>

      {/* Virtual Offices List */}
      <Card>
        <CardHeader>
          <CardTitle>Moje virtuálne kancelárie</CardTitle>
          <CardDescription>
            Zoznam všetkých virtuálnych kancelárií, kde ste účastníkom
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Krok 1: Čakáme na používateľa ALEBO na kancelárie (ktoré čakajú na používateľa) */}
          {(isUserLoading || isOfficesLoading) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            /* Krok 2: Oba dotazy sú hotové. Teraz skontrolujeme, či máme dáta. */
            offices && offices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Zatiaľ nemáte žiadne virtuálne kancelárie</p>
                <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first">
                  <Plus className="mr-2 h-4 w-4" />
                  Vytvoriť prvú kanceláriu
                </Button>
              </div>
            ) : (
              /* Krok 3: Máme dáta, zobrazíme tabuľku */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Účastníci</TableHead>
                    <TableHead>Dokumenty</TableHead>
                    <TableHead>Vytvorené</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices?.map((office) => {
                    const statusDisplay = getStatusDisplay(office.status);
                    const participantsCount = office.participants?.length || 0;
                    const documentsCount = office.documents?.length || 0;
                    
                    return (
                      <TableRow
                        key={office.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/virtual-office/${office.id}`)}
                        data-testid={`row-office-${office.id}`}
                      >
                        <TableCell className="font-medium">{office.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusDisplay.className}>
                            {statusDisplay.text}
                          </Badge>
                        </TableCell>
                        <TableCell>{participantsCount}</TableCell>
                        <TableCell>{documentsCount}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(office.createdAt).toLocaleDateString('sk-SK')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-office">
          <DialogHeader>
            <DialogTitle>Vytvoriť virtuálnu kanceláriu</DialogTitle>
            <DialogDescription>
              Vytvorte novú virtuálnu kanceláriu pre digitálne podpisovanie dokumentov
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="office-name">Názov kancelárie</Label>
              <Input
                id="office-name"
                placeholder="Napr. Predaj vozidla - Škoda Octavia"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                data-testid="input-office-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleCreateOffice}
              disabled={createOfficeMutation.isPending}
              data-testid="button-submit"
            >
              {createOfficeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvoriť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
