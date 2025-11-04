import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BackButton from "@/components/BackButton";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Upload, FileText } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreateUploadDocument() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();

  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const contractContent = {
        fileName: fileName,
        uploadDate: new Date().toLocaleDateString('sk-SK'),
        content: fileContent,
      };

      const contractTitle = title || `Vlastný dokument - ${fileName}`;
      
      return await apiRequest('POST', '/api/contracts', {
        title: contractTitle,
        type: 'custom',
        content: JSON.stringify(contractContent),
        ownerEmail: currentUser?.email || '',
      });
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts(currentUser?.email || '') });
  setLocation('/moje-zmluvy');
    },
  });

  const handleSave = () => {
    if (!fileName || !fileContent) {
      return;
    }
    createContractMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <BackButton onClick={() => setLocation('/create-document')} />
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Nahrať vlastný dokument</h2>
              <p className="text-muted-foreground">Nahrajte váš vlastný dokument na podpísanie</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Názov dokumentu (voliteľné)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Napr. Zmluva o dielo"
                data-testid="input-document-title"
              />
            </div>

            <div>
              <Label htmlFor="file-upload">Vybrať dokument *</Label>
              <div className="mt-2">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    data-testid="button-select-file"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Vybrať súbor
                  </Button>
                  {fileName && (
                    <span className="text-sm text-muted-foreground" data-testid="text-selected-file">
                      {fileName}
                    </span>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Podporované formáty: TXT, DOC, DOCX, PDF
              </p>
            </div>

            {fileContent && (
              <div>
                <Label>Náhľad obsahu dokumentu</Label>
                <div className="mt-2 p-4 bg-muted rounded-md max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap" data-testid="text-file-preview">
                    {fileContent.substring(0, 500)}
                    {fileContent.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation('/create-document')}
                data-testid="button-cancel"
              >
                Zrušiť
              </Button>
              <Button
                onClick={handleSave}
                disabled={createContractMutation.isPending}
                data-testid="button-upload-document"
              >
                {createContractMutation.isPending ? 'Nahrávam...' : 'Nahrať dokument'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
