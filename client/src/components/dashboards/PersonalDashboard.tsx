import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Contract, VirtualOffice, VirtualOfficeParticipant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";

interface VirtualOfficeEnriched extends VirtualOffice {
  participants: Array<VirtualOfficeParticipant & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  documents: any[];
}

interface Mandate {
  mandateId: string;
  ico: string;
  companyName: string;
  role: string;
  status: string;
  invitationContext?: string;
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

interface CurrentUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  mandates: Mandate[];
  activeContext: string | null;
}

export default function PersonalDashboard() {
  const [, setLocation] = useLocation();
  const { data: currentUser, activeContext } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data including mandates
  const { data: userData, isLoading: isLoadingUser } = useQuery<CurrentUserResponse>({
    queryKey: ['/api/current-user'],
  });

  // Fetch contracts for the current user
  const { data: contracts } = useQuery<Contract[]>({
    queryKey: QUERY_KEYS.contracts(currentUser?.email || ''),
    enabled: !!currentUser?.email,
  });

  // Fetch virtual offices for the current user (default to empty array)
  const { data: virtualOffices = [] } = useQuery<VirtualOfficeEnriched[]>({
    queryKey: QUERY_KEYS.virtualOffices(),
    enabled: !!currentUser,
  });

  // Filter pending mandate invitations - only for personal context
  const pendingMandates = userData?.mandates?.filter(m => 
    m.status === 'pending_confirmation' && 
    m.invitationContext === 'personal'
  ) || [];
  
  // Filter pending VK invitations (use currentUser?.id and safe access)
  const pendingVKInvitations = virtualOffices
    .filter(vk => vk.participants?.some(p => p.userId === currentUser?.id && p.status === 'INVITED'))
    .map(vk => {
      const myParticipation = vk.participants?.find(p => p.userId === currentUser?.id);
      return {
        officeId: vk.id,
        officeName: vk.name,
        participantId: myParticipation?.id,
        invitedAt: myParticipation?.invitedAt,
        requiredRole: myParticipation?.requiredRole,
        requiredCompanyIco: myParticipation?.requiredCompanyIco,
      };
    });

  // Filter active VK tasks (use currentUser?.id and safe access)
  const activeVKTasks = virtualOffices.filter(
    (vk) =>
      vk.status === 'active' &&
      vk.documents?.some(
        (doc) =>
          doc.signatures?.some(
            (sig) =>
              sig.participantId ===
                vk.participants?.find((p) => p.userId === currentUser?.id)?.id &&
              sig.status === 'PENDING'
          )
      )
  );

  // Calculate counts
  const contractsCount = contracts?.length || 0;
  const virtualOfficesCount = virtualOffices?.length || 0;
  const activeCount = virtualOffices?.filter(o => o.status === 'active').length || 0;
  const completedCount = virtualOffices?.filter(o => o.status === 'completed').length || 0;
  // Documents derived from virtual offices
  const allDocuments = virtualOffices?.flatMap(o => o.documents || []) || [];
  const pendingDocumentsCount = allDocuments.filter(d => d.status === 'pending').length;
  const signedDocumentsCount = allDocuments.filter(d => d.status === 'completed').length;
  const documentsCount = allDocuments.length || 0;

  // Accept mandate mutation
  const acceptMandateMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      return await apiRequest('PATCH', `/api/mandates/${mandateId}`, { stav: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/current-user'] });
      toast({
        title: "Mandát prijatý",
        description: "Úspešne ste prijali pozvánku na spoluprácu.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa prijať mandát.",
        variant: "destructive",
      });
    }
  });

  // Reject mandate mutation
  const rejectMandateMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      return await apiRequest('PATCH', `/api/mandates/${mandateId}`, { stav: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/current-user'] });
      toast({
        title: "Mandát odmietnutý",
        description: "Pozvánka bola odmietnutá.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa odmietnuť mandát.",
        variant: "destructive",
      });
    }
  });

  // Accept VK invitation mutation
  const acceptVKInvitationMutation = useMutation({
    mutationFn: async ({ officeId, participantId }: { officeId: string; participantId: string }) => {
      return await apiRequest('PATCH', `/api/virtual-offices/${officeId}/participants/${participantId}`, {
        status: 'ACCEPTED'
      });
    },
    onSuccess: () => {
      toast({ title: "Pozvánka prijatá", description: "Boli ste pridaný do virtuálnej kancelárie." });
      // Znovu načítame dáta pre dashboard a current user
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtualOffices() });
      queryClient.invalidateQueries({ queryKey: ['/api/current-user'] });
    },
    onError: (error: any) => {
      console.error("Chyba pri prijatí VK pozvánky:", error);
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa prijať pozvánku.", variant: "destructive" });
    }
  });
  const acceptVKInvitation = ({ officeId, participantId }: { officeId: string; participantId: string }) =>
    acceptVKInvitationMutation.mutate({ officeId, participantId });

  // Reject VK invitation mutation
  const rejectVKInvitationMutation = useMutation({
    mutationFn: async ({ officeId, participantId }: { officeId: string; participantId: string }) => {
      return await apiRequest('PATCH', `/api/virtual-offices/${officeId}/participants/${participantId}`, {
        status: 'REJECTED'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtualOffices() });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="personal-dashboard">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Váš osobný profil</h1>
        <p className="text-muted-foreground">
          Spravujte svoje osobné dokumenty a digitálne úkony.
        </p>
      </div>

      {/* Quick Stats - Clickable Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer transition-all hover-elevate active-elevate-2"
          data-testid="card-my-contracts"
          onClick={() => setLocation('/moje-zmluvy')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moje zmluvy</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{`${pendingDocumentsCount}/${signedDocumentsCount}`}</div>
              <p className="text-xs text-muted-foreground">Na podpis / Podpísané</p>
            </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover-elevate active-elevate-2"
          onClick={() => setLocation('/virtual-office')}
          data-testid="card-virtual-offices"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virtuálne kancelárie</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{`${activeCount}/${completedCount}`}</div>
            <p className="text-xs text-muted-foreground">Aktívne / Dokončené</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover-elevate active-elevate-2"
          onClick={() => setLocation('/my-documents')}
          data-testid="card-my-documents"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">E-dokumenty</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount}</div>
            <p className="text-xs text-muted-foreground">Moje e-dokumenty</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover-elevate active-elevate-2"
          onClick={() => {
            const element = document.getElementById('pending-mandates-section');
            element?.scrollIntoView({ behavior: 'smooth' });
          }}
          data-testid="card-pending-mandates"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Čakajúce úkony</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMandates.length + pendingVKInvitations.length + activeVKTasks.length}</div>
            <p className="text-xs text-muted-foreground">Úkony vyžadujúce pozornosť</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Rýchle akcie</CardTitle>
          <CardDescription>
            Začnite s najčastejšími úkonmi vo vašom osobnom profile
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => setLocation('/create-document')}
            data-testid="button-create-document"
          >
            <FileText className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Vytvoriť dokument</div>
              <div className="text-xs text-muted-foreground">Nový digitálny dokument</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => setLocation('/verify-document')}
            data-testid="button-verify-document"
          >
            <Shield className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Overiť dokument</div>
              <div className="text-xs text-muted-foreground">Kontrola pravosti dokumentu</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => setLocation('/virtual-office')}
            data-testid="button-virtual-office"
          >
            <Briefcase className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Virtuálna kancelária</div>
              <div className="text-xs text-muted-foreground">Digitálne podpisovanie</div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Pending Invitations and Active Tasks - Detail View */}
      {(pendingMandates.length > 0 || pendingVKInvitations.length > 0 || activeVKTasks.length > 0) && (
        <Card id="pending-mandates-section">
          <CardHeader>
            <CardTitle>Čakajúce úkony</CardTitle>
            <CardDescription>Skontrolujte pozvánky na spoluprácu a virtuálne kancelárie vyžadujúce vašu pozornosť</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mandate invitations */}
              {pendingMandates.map((mandate) => (
                <div
                  key={mandate.mandateId}
                  className="flex flex-col gap-4 p-4 border rounded-lg"
                  data-testid={`mandate-invitation-${mandate.mandateId}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-lg" data-testid="text-company-name">
                        {mandate.companyName}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1" data-testid="text-role">
                        Ponúknutá rola: <span className="font-medium">{mandate.role}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        IČO: {mandate.ico}
                      </p>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertDescription>
                      Boli ste pozvaní na spoluprácu s touto spoločnosťou. Prijatím pozvánky získate prístup k firemným funkciám a budete môcť konať v mene spoločnosti v rozsahu vašich oprávnení.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      size="default"
                      onClick={() => acceptMandateMutation.mutate(mandate.mandateId)}
                      disabled={acceptMandateMutation.isPending || rejectMandateMutation.isPending}
                      data-testid={`button-accept-${mandate.mandateId}`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Prijať
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={() => rejectMandateMutation.mutate(mandate.mandateId)}
                      disabled={acceptMandateMutation.isPending || rejectMandateMutation.isPending}
                      data-testid={`button-reject-${mandate.mandateId}`}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Odmietnuť
                    </Button>
                  </div>
                </div>
              ))}

              {/* VK invitations */}
              {pendingVKInvitations.map((invitation) => (
                <div
                  key={invitation.participantId}
                  className="flex flex-col gap-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20"
                  data-testid={`vk-invitation-${invitation.participantId}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-lg" data-testid="text-office-name">
                        {invitation.officeName}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pozvánka do virtuálnej kancelárie
                      </p>
                      {invitation.requiredRole && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Požadovaná rola: <span className="font-medium">{invitation.requiredRole}</span>
                        </p>
                      )}
                      {invitation.requiredCompanyIco && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Požadované IČO firmy: {invitation.requiredCompanyIco}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Alert className="bg-background">
                    <AlertDescription>
                      Boli ste pozvaní do virtuálnej kancelárie. Prijatím pozvánky získate prístup k dokumentom a budete môcť participovať na digitálnom podpisovaní.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      size="default"
                      onClick={() => acceptVKInvitation({
                        officeId: invitation.officeId,
                        participantId: invitation.participantId!
                      })}
                      disabled={acceptVKInvitationMutation.isPending || rejectVKInvitationMutation.isPending}
                      data-testid={`button-accept-vk-${invitation.participantId}`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Prijať
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={() => rejectVKInvitationMutation.mutate({
                        officeId: invitation.officeId,
                        participantId: invitation.participantId!
                      })}
                      disabled={acceptVKInvitationMutation.isPending || rejectVKInvitationMutation.isPending}
                      data-testid={`button-reject-vk-${invitation.participantId}`}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Odmietnuť
                    </Button>
                  </div>
                </div>
              ))}

              {/* Active VK Tasks */}
              {activeVKTasks.map((vk) => {
                const statusDisplay = getStatusDisplay(vk.status);
                return (
                  <div
                    key={vk.id}
                    className="flex flex-col gap-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20"
                    data-testid={`vk-task-${vk.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <p className="font-medium text-lg" data-testid="text-vk-name">
                            {vk.name}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status: <Badge variant="secondary" className={statusDisplay.className}>{statusDisplay.text}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {vk.documents.length} {vk.documents.length === 1 ? 'dokument' : vk.documents.length < 5 ? 'dokumenty' : 'dokumentov'}
                        </p>
                      </div>
                    </div>
                    
                    <Alert className="bg-background">
                      <AlertDescription>
                        Táto virtuálna kancelária obsahuje dokumenty, ktoré môžu vyžadovať váš podpis alebo pozornosť.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        size="default"
                        onClick={() => setLocation(`/virtual-office/${vk.id}`)}
                        data-testid={`button-open-vk-${vk.id}`}
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        Otvoriť VK
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {pendingMandates.length === 0 && pendingVKInvitations.length === 0 && activeVKTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aktuálne nemáte žiadne čakajúce pozvánky ani úlohy vo virtuálnych kanceláriách.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Nedávna aktivita</CardTitle>
          <CardDescription>Vaše posledné úkony a zmeny</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Zatiaľ nemáte žiadnu aktivitu
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
