import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS as queryKeys } from "@/lib/queryKeys";
import type { VirtualOffice } from "@shared/schema";

type VirtualOfficeEnriched = VirtualOffice & {
  documents?: Array<any>;
};

type VirtualOfficeDocument = any;

export function ContractListPage() {
  const { data: offices, isLoading: isLoadingOffices } = useQuery<VirtualOfficeEnriched[]>({
    queryKey: queryKeys.virtualOffices(),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/virtual-offices");
      return res.json();
    },
    retry: false,
  });

  const allDocuments: VirtualOfficeDocument[] = offices?.flatMap((o) => o.documents || []) || [];
  const pendingDocuments = allDocuments.filter((d) => d.status === "pending");
  const completedDocuments = allDocuments.filter((d) => d.status === "completed");

  if (isLoadingOffices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dokumenty na podpis ({pendingDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={pendingDocuments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podpísané dokumenty ({completedDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={completedDocuments} />
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTable({ documents }: { documents: VirtualOfficeDocument[] }) {
  if (!documents || documents.length === 0) {
    return <p className="text-muted-foreground">Žiadne dokumenty v tejto kategórii.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Názov (z VK)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vytvorené</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell className="font-medium">Dokument (ID: ...{String(doc.id).slice(-6)})</TableCell>
            <TableCell>
              {doc.status === "pending" ? (
                <Badge variant="outline" className="text-orange-500">
                  <Clock className="mr-2 h-4 w-4" />
                  Čaká na podpis
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Podpísané
                </Badge>
              )}
            </TableCell>
            <TableCell>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("sk-SK") : "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ContractListPage;
