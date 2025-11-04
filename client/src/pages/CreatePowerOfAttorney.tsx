import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BackButton from "@/components/BackButton";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FileCheck } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreatePowerOfAttorney() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();

  // Principal (splnomocniteľ) information
  const [principalName, setPrincipalName] = useState('Ján Nováček');
  const [principalAddress, setPrincipalAddress] = useState('Masarykova 456, 602 00 Brno, Česká republika');
  const [principalIdNumber, setPrincipalIdNumber] = useState('880215/1234');

  // Attorney (splnomocnenec) information
  const [attorneyName, setAttorneyName] = useState('Petra Ambroz');
  const [attorneyAddress, setAttorneyAddress] = useState('Hlavná 25, 811 01 Bratislava, Slovensko');
  const [attorneyIdNumber, setAttorneyIdNumber] = useState('920308/5678');

  // Power of attorney details
  const [authorizedActions, setAuthorizedActions] = useState('Zastupovanie na úradoch, podpisovanie dokumentov, prevzatie korešpondencie');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const contractContent = {
        principal: {
          name: principalName,
          birthNumber: principalIdNumber,
          address: principalAddress,
        },
        attorney: {
          name: attorneyName,
          birthNumber: attorneyIdNumber,
          address: attorneyAddress,
        },
        authorizedActions: authorizedActions,
        validFrom: validFrom || new Date().toLocaleDateString('sk-SK'),
        validUntil: validUntil || 'Do odvolania',
        additionalTerms: additionalTerms || 'Žiadne dodatočné podmienky',
        signingPlace: 'Bratislava',
        signingDate: new Date().toLocaleDateString('sk-SK'),
      };

      const title = `Splnomocnenie - ${attorneyName}`;
      
      return await apiRequest('POST', '/api/contracts', {
        title,
        type: 'power_of_attorney',
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
    if (!principalName || !attorneyName || !authorizedActions) {
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
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Splnomocnenie</h2>
              <p className="text-muted-foreground">Štandardné slovenské splnomocnenie</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Principal Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Splnomocniteľ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="principal-name">Meno a priezvisko *</Label>
                  <Input
                    id="principal-name"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="Ján Novák"
                    data-testid="input-principal-name"
                  />
                </div>
                <div>
                  <Label htmlFor="principal-id">Rodné číslo *</Label>
                  <Input
                    id="principal-id"
                    value={principalIdNumber}
                    onChange={(e) => setPrincipalIdNumber(e.target.value)}
                    placeholder="900101/1234"
                    data-testid="input-principal-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="principal-address">Bydlisko *</Label>
                  <Input
                    id="principal-address"
                    value={principalAddress}
                    onChange={(e) => setPrincipalAddress(e.target.value)}
                    placeholder="Hlavná 123, 811 01 Bratislava"
                    data-testid="input-principal-address"
                  />
                </div>
              </div>
            </div>

            {/* Attorney Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Splnomocnenec</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="attorney-name">Meno a priezvisko *</Label>
                  <Input
                    id="attorney-name"
                    value={attorneyName}
                    onChange={(e) => setAttorneyName(e.target.value)}
                    placeholder="Peter Kováč"
                    data-testid="input-attorney-name"
                  />
                </div>
                <div>
                  <Label htmlFor="attorney-id">Rodné číslo *</Label>
                  <Input
                    id="attorney-id"
                    value={attorneyIdNumber}
                    onChange={(e) => setAttorneyIdNumber(e.target.value)}
                    placeholder="850505/5678"
                    data-testid="input-attorney-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="attorney-address">Bydlisko *</Label>
                  <Input
                    id="attorney-address"
                    value={attorneyAddress}
                    onChange={(e) => setAttorneyAddress(e.target.value)}
                    placeholder="Vysoká 456, 821 09 Bratislava"
                    data-testid="input-attorney-address"
                  />
                </div>
              </div>
            </div>

            {/* Authorized Actions */}
            <div>
              <Label htmlFor="authorized-actions">Rozsah splnomocnenia *</Label>
              <Textarea
                id="authorized-actions"
                value={authorizedActions}
                onChange={(e) => setAuthorizedActions(e.target.value)}
                placeholder="Napríklad: Zastupovanie na úrade, podpisovanie zmlúv, prevzatie dokumentov..."
                rows={4}
                data-testid="input-authorized-actions"
              />
            </div>

            {/* Validity Period */}
            <div>
              <h3 className="text-lg font-medium mb-4">Platnosť splnomocnenia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid-from">Platné od</Label>
                  <Input
                    id="valid-from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    data-testid="input-valid-from"
                  />
                </div>
                <div>
                  <Label htmlFor="valid-until">Platné do</Label>
                  <Input
                    id="valid-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    data-testid="input-valid-until"
                  />
                </div>
              </div>
            </div>

            {/* Additional Terms */}
            <div>
              <Label htmlFor="additional-terms">Dodatočné podmienky</Label>
              <Textarea
                id="additional-terms"
                value={additionalTerms}
                onChange={(e) => setAdditionalTerms(e.target.value)}
                placeholder="Napríklad: Splnomocnenie je neprenosné..."
                rows={3}
                data-testid="input-additional-terms"
              />
            </div>

            {/* Action Buttons */}
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
                data-testid="button-save-contract"
              >
                {createContractMutation.isPending ? 'Ukladám...' : 'Uložiť'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
