import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Loader2, ArrowLeft, CheckCircle, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

// Define local types used by the component (fall back if shared types are not present)
interface AttestationEntry {
  userName: string;
  signedAt: string;
  type: 'personal' | 'company';
  companyName?: string;
  companyIco?: string;
  role?: string;
}
interface AttestationData {
  documentTitle: string;
  completedAt: string;
  attestationEntries: AttestationEntry[];
}

export function AttestationPage() {
  const params = useParams();
  const documentId = params.documentId;

  const { data, isLoading } = useQuery<AttestationData>({
    queryKey: ['attestation', documentId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/virtual-office-documents/${documentId}/attestation`);
      return res.json();
    },
    enabled: !!documentId,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 my-12">
      <Link href="/virtual-office" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Späť na Virtuálne kancelárie
      </Link>

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-center text-green-600 mb-2">
            <CheckCircle className="mr-3 h-6 w-6" />
            <h1 className="text-2xl font-bold">Doložka o Podpísaní</h1>
          </div>
          <CardDescription>
            Tento dokument bol úspešne elektronicky podpísaný všetkými stranami.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Dokument sekcia */}
          <div>
            <h3 className="text-lg font-semibold flex items-center mb-2">
              <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
              Dokument
            </h3>
            <p><strong>Názov:</strong> {data.documentTitle}</p>
            <p className="text-sm text-muted-foreground">
              <strong>Dokončené dňa:</strong> {new Date(data.completedAt).toLocaleString('sk-SK')}
            </p>
          </div>

          <Separator />

          {/* Podpisujúci */}
          <div>
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Users className="mr-2 h-5 w-5 text-muted-foreground" />
              Podpisujúci
            </h3>
            <div className="space-y-4">
              {data.attestationEntries.map((entry, idx) => (
                <div key={idx} className="p-3 border rounded-md">
                  <p className="font-semibold">{entry.userName}</p>
                  {entry.type === 'company' && (
                    <Badge variant="secondary">{entry.role} @ {entry.companyName}</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Podpísané dňa: {new Date(entry.signedAt).toLocaleString('sk-SK')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttestationPage;
