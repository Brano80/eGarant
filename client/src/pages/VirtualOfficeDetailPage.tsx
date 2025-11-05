import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Loader2, UserPlus, Upload, CheckCircle2, XCircle, Clock, FileSignature, FileCheck } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VirtualOffice, VirtualOfficeParticipant, VirtualOfficeDocument } from "@shared/schema";
import { MOCK_INVITATION_OPTIONS } from "@/lib/constants";
import { DigitalSigningDialog } from "@/components/DigitalSigningDialog";

interface SignatureInfo {
  id: string;
  participantId: string;
  userId: string;
  userName: string;
  status: 'PENDING' | 'SIGNED';
  signedAt: Date | null;
  isCurrentUser: boolean;
}

interface VirtualOfficeEnriched extends VirtualOffice {
  participants: Array<VirtualOfficeParticipant & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  documents: Array<VirtualOfficeDocument & {
    contract: {
      id: string;
      title: string;
      type: string;
    };
    signatures: SignatureInfo[];
  }>;
}

interface AttestationEntry {
  userName: string;
  signedAt: Date | null;
  type: 'personal' | 'company';
  companyName?: string;
  companyIco?: string;
  role?: string;
  mandateVerificationSource?: string;
}

interface AttestationData {
  documentTitle: string;
  completedAt: Date | null;
  attestationEntries: AttestationEntry[];
}

const getStatusDisplay = (status: string): { text: string; variant: any } => {
  switch (status) {
    case 'ACCEPTED':
      return { text: 'Prijatý', variant: 'default' };
    case 'INVITED':
      return { text: 'Pozvaný', variant: 'secondary' };
    case 'REJECTED':
      return { text: 'Odmietnutý', variant: 'destructive' };
    default:
      return { text: status, variant: 'outline' };
  }
};

const getDocumentStatusDisplay = (status: string): { text: string; variant: any } => {
  switch (status) {
    case 'signed':
      return { text: 'Podpísaný', variant: 'default' };
    case 'pending':
      return { text: 'Čaká na podpis', variant: 'secondary' };
    default:
      return { text: status, variant: 'outline' };
  }
};

export default function VirtualOfficeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedInvitationOption, setSelectedInvitationOption] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitationContext, setInvitationContext] = useState('');
  const [requiredRole, setRequiredRole] = useState('');
  const [requiredCompanyIco, setRequiredCompanyIco] = useState('');
  
  // Signing dialog state
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VirtualOfficeDocument & { contract: { id: string; title: string; type: string } } | null>(null);
  
  // Attestation dialog state
  const [showAttestationDialog, setShowAttestationDialog] = useState(false);
  const [attestationData, setAttestationData] = useState<AttestationData | null>(null);
  const [isLoadingAttestation, setIsLoadingAttestation] = useState(false);

  // Fetch virtual office detail
  const { data: office, isLoading, isError } = useQuery<VirtualOfficeEnriched>({
    queryKey: [`/api/virtual-offices/${id}`],
    enabled: !!id,
  });

  // Invite participant mutation
  const inviteParticipantMutation = useMutation({
    mutationFn: async (data: { email: string; invitationContext: string; requiredRole?: string; requiredCompanyIco?: string }) => {
      const response = await apiRequest("POST", `/api/virtual-offices/${id}/participants`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/virtual-offices/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/virtual-offices'] });
      setShowInviteDialog(false);
      setSelectedInvitationOption('');
      setInviteEmail('');
      setInvitationContext('');
      setRequiredRole('');
      setRequiredCompanyIco('');
    },
  });

  // Respond to invitation mutation (accept/reject)
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const response = await apiRequest("PATCH", `/api/virtual-offices/${id}/participants/${participantId}`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/virtual-offices/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/virtual-offices'] });
    },
  });

  const handleInvitationOptionSelect = (optionId: string) => {
    const option = MOCK_INVITATION_OPTIONS.find(opt => opt.id === optionId);
    if (option) {
      setSelectedInvitationOption(optionId);
      setInviteEmail(option.email);
      setInvitationContext(option.invitationContext);
      
      // Reset mandate requirements for personal invitations
      if (option.invitationContext === 'personal') {
        setRequiredRole('');
        setRequiredCompanyIco('');
      } else {
        setRequiredRole(option.requiredRole);
        setRequiredCompanyIco(option.requiredCompanyIco);
      }
    }
  };

  const handleInviteParticipant = () => {
    if (!inviteEmail.trim()) {
      return;
    }

    if (!invitationContext) {
      return;
    }

    // For personal invitations, don't send mandate requirements
    const invitationData: any = {
      email: inviteEmail,
      invitationContext: invitationContext,
    };

    // Only include mandate requirements for company invitations
    if (invitationContext !== 'personal') {
      if (requiredRole) invitationData.requiredRole = requiredRole;
      if (requiredCompanyIco) invitationData.requiredCompanyIco = requiredCompanyIco;
    }

    inviteParticipantMutation.mutate(invitationData);
  };

  const fetchAndShowAttestation = async (documentId: string) => {
    setIsLoadingAttestation(true);
    try {
      const data = await queryClient.fetchQuery<AttestationData>({
        queryKey: [`/api/virtual-office-documents/${documentId}/attestation`],
      });
      
      setAttestationData(data);
      setShowAttestationDialog(true);
    } catch (error: any) {
      // Silent error
    } finally {
      setIsLoadingAttestation(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !office) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Virtuálna kancelária nebola nájdená alebo nemáte oprávnenie na jej zobrazenie.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setLocation('/virtual-office')}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Späť na zoznam
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/virtual-office')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-office-name">
              {office.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Detail virtuálnej kancelárie
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Účastníci</CardTitle>
              <CardDescription>
                Zoznam všetkých účastníkov tejto virtuálnej kancelárie
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              size="sm"
              data-testid="button-invite-participant"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Pozvať účastníka
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {office.participants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Zatiaľ nie sú žiadni účastníci</p>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(true)}
                data-testid="button-invite-first"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Pozvať prvého účastníka
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meno</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>IČO firmy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pozvaný</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {office.participants.map((participant) => {
                  const statusDisplay = getStatusDisplay(participant.status);
                  const isCurrentUser = currentUser && participant.user.email === currentUser.email;
                  const canAccept = isCurrentUser && participant.status === 'INVITED';
                  
                  return (
                    <TableRow key={participant.id} data-testid={`row-participant-${participant.id}`}>
                      <TableCell className="font-medium">{participant.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{participant.user.email}</TableCell>
                      <TableCell>{participant.requiredRole || '—'}</TableCell>
                      <TableCell>{participant.requiredCompanyIco || '—'}</TableCell>
                      <TableCell>
                        {canAccept ? (
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => respondToInvitationMutation.mutate({ participantId: participant.id, status: 'ACCEPTED' })}
                            disabled={respondToInvitationMutation.isPending}
                            data-testid={`button-accept-${participant.id}`}
                          >
                            {respondToInvitationMutation.isPending ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            Prijať
                          </Button>
                        ) : (
                          <Badge variant={participant.status === 'ACCEPTED' ? 'default' : statusDisplay.variant} className={`h-8 flex items-center ${participant.status === 'ACCEPTED' ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                            {participant.status === 'ACCEPTED' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {participant.status === 'INVITED' && <Clock className="mr-1 h-3 w-3" />}
                            {participant.status === 'REJECTED' && <XCircle className="mr-1 h-3 w-3" />}
                            {statusDisplay.text}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(participant.invitedAt).toLocaleDateString('sk-SK')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dokumenty</CardTitle>
              <CardDescription>
                Dokumenty pripojené k tejto virtuálnej kancelárii
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/moje-zmluvy?add-to-vk=${id}`)}
              data-testid="button-upload-document"
            >
              <Upload className="mr-2 h-4 w-4" />
              Pridať existujúcu zmluvu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {office.documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Zatiaľ nie sú žiadne dokumenty</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Názov dokumentu</TableHead>
                  <TableHead>Meno podpisujúceho</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nahraný</TableHead>
                  <TableHead className="text-right">Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {office.documents.flatMap((doc) => 
                  doc.signatures.map((signature) => {
                    const isSigned = signature.status === 'SIGNED';
                    const isPending = signature.status === 'PENDING';
                    const allSignaturesSigned = doc.signatures.every(s => s.status === 'SIGNED');
                    
                    return (
                      <TableRow key={`${doc.id}-${signature.id}`} data-testid={`row-document-${doc.id}-${signature.userId}`}>
                        <TableCell className="font-medium">{doc.contract.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {signature.userName}
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {doc.contract.type}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isSigned ? "default" : "secondary"}
                            className={isSigned ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}
                          >
                            {isSigned ? 'Podpísané' : 'Čaká na podpis'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString('sk-SK')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {signature.isCurrentUser && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowSignDialog(true);
                                }}
                                disabled={isSigned}
                                data-testid={`button-sign-${doc.id}`}
                              >
                                <FileSignature className="mr-2 h-4 w-4" />
                                Podpísať
                              </Button>
                            )}
                            {allSignaturesSigned && signature.isCurrentUser && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => fetchAndShowAttestation(doc.id)}
                                disabled={isLoadingAttestation}
                                data-testid={`button-attestation-${doc.id}`}
                              >
                                {isLoadingAttestation ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <FileCheck className="mr-2 h-4 w-4" />
                                )}
                                Zobraziť doložku
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent data-testid="dialog-invite-participant">
          <DialogHeader>
            <DialogTitle>Pozvať účastníka</DialogTitle>
            <DialogDescription>
              Pridajte nového účastníka do tejto virtuálnej kancelárie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-participant">Účastník *</Label>
              <Select
                value={selectedInvitationOption}
                onValueChange={handleInvitationOptionSelect}
              >
                <SelectTrigger data-testid="select-participant">
                  <SelectValue placeholder="Vyberte účastníka" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_INVITATION_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vyberte, či chcete pozvať fyzickú osobu alebo firmu
              </p>
            </div>
            {invitationContext && invitationContext !== 'personal' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="required-role">Požadovaná rola</Label>
                  <Input
                    id="required-role"
                    placeholder="Napr. Konateľ, Prokurist"
                    value={requiredRole}
                    onChange={(e) => setRequiredRole(e.target.value)}
                    data-testid="input-required-role"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pozvaný používateľ musí mať túto rolu v zadanej firme
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="required-ico">Požadované IČO firmy</Label>
                  <Input
                    id="required-ico"
                    placeholder="Napr. 12345678"
                    value={requiredCompanyIco}
                    onChange={(e) => setRequiredCompanyIco(e.target.value)}
                    data-testid="input-required-ico"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pozvaný používateľ musí mať mandát v tejto firme
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              data-testid="button-cancel"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleInviteParticipant}
              disabled={inviteParticipantMutation.isPending}
              data-testid="button-submit"
            >
              {inviteParticipantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pozvať
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Signing Dialog */}
      <DigitalSigningDialog
        open={showSignDialog}
        onOpenChange={setShowSignDialog}
        contractName={selectedDocument?.contract.title || ''}
        documentId={selectedDocument?.id}
        onComplete={() => {
          setShowSignDialog(false);
          setSelectedDocument(null);
          // Refresh data
          queryClient.invalidateQueries({ queryKey: [`/api/virtual-offices/${id}`] });
          // Invalidate all contracts queries to refresh contract status
          queryClient.refetchQueries({ 
            predicate: ({ queryKey }) =>
              Array.isArray(queryKey) && 
              typeof queryKey[0] === 'string' &&
              (queryKey[0].startsWith('/api/contracts?') || queryKey[0] === '/api/contracts')
          });
        }}
      />

      {/* Attestation Dialog */}
      <Dialog open={showAttestationDialog} onOpenChange={setShowAttestationDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-attestation">
          <DialogHeader>
            <DialogTitle>Doložka o overení mandátov</DialogTitle>
            <DialogDescription>
              Dokument: {attestationData?.documentTitle}
            </DialogDescription>
          </DialogHeader>
          
          {attestationData && (
            <div className="space-y-4">
              {attestationData.completedAt && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm">
                    <strong>Dokončené:</strong>{' '}
                    {new Date(attestationData.completedAt).toLocaleString('sk-SK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-3">Podpisy a overenie mandátov</h4>
                {attestationData.attestationEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Zatiaľ nie sú žiadne podpisy
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meno</TableHead>
                        <TableHead>Dátum podpisu</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Firma / Rola</TableHead>
                        <TableHead>Zdroj overenia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attestationData.attestationEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {entry.userName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.signedAt 
                              ? new Date(entry.signedAt).toLocaleString('sk-SK', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.type === 'company' ? 'default' : 'secondary'}>
                              {entry.type === 'company' ? 'Firma' : 'Fyzická osoba'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.type === 'company' ? (
                              <div>
                                <div className="font-medium">{entry.companyName}</div>
                                <div className="text-muted-foreground text-xs">
                                  IČO: {entry.companyIco} • {entry.role}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.type === 'company' ? entry.mandateVerificationSource : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setShowAttestationDialog(false)}
              data-testid="button-close-attestation"
            >
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
