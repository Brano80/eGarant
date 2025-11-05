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
import { Building2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreatePropertyContract() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();

  // Seller information
  const [sellerName, setSellerName] = useState('Petra Ambroz');
  const [sellerAddress, setSellerAddress] = useState('Hlavná 25, 811 01 Bratislava, Slovensko');
  const [sellerIdNumber, setSellerIdNumber] = useState('920308/5678');

  // Buyer information
  const [buyerName, setBuyerName] = useState('Andres Elgueta');
  const [buyerAddress, setBuyerAddress] = useState('Avenida Providencia 1234, Santiago, Chile');
  const [buyerIdNumber, setBuyerIdNumber] = useState('24.567.890-1');

  // Property information
  const [propertyAddress, setPropertyAddress] = useState('Slnečná 15, 811 02 Bratislava');
  const [propertyType, setPropertyType] = useState('3-izbový byt');
  const [propertySize, setPropertySize] = useState('78');
  const [cadastralArea, setCadastralArea] = useState('Bratislava - Staré Mesto');
  const [landRegistryNumber, setLandRegistryNumber] = useState('1234');
  const [parcelNumber, setParcelNumber] = useState('5678/12');

  // Contract details
  const [purchasePrice, setPurchasePrice] = useState('185000');
  const [paymentMethod, setPaymentMethod] = useState('Bankový prevod');
  const [handoverDate, setHandoverDate] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const contractContent = {
        seller: {
          name: sellerName,
          birthNumber: sellerIdNumber,
          address: sellerAddress,
        },
        buyer: {
          name: buyerName,
          birthNumber: buyerIdNumber,
          address: buyerAddress,
        },
        property: {
          address: propertyAddress,
          type: propertyType,
          floorArea: propertySize,
          cadastralArea: cadastralArea,
          landRegistryNumber: landRegistryNumber,
          parcelNumber: parcelNumber,
        },
        price: purchasePrice,
        paymentMethod: paymentMethod,
        handoverDate: handoverDate || 'Podľa dohody',
        additionalTerms: additionalTerms || 'Žiadne dodatočné podmienky',
        signingPlace: 'Bratislava',
        signingDate: new Date().toLocaleDateString('sk-SK'),
      };

      const title = `Kúpno-predajná zmluva - ${propertyAddress}`;
      
      return await apiRequest('POST', '/api/contracts', {
        title,
        type: 'property',
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
    if (!sellerName || !buyerName || !propertyAddress || !purchasePrice) {
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
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Kúpno-predajná zmluva nehnuteľnosti</h2>
              <p className="text-muted-foreground">Štandardná slovenská zmluva o kúpe nehnuteľnosti</p>
            </div>
          </div>

          <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Seller Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Údaje predávajúceho</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sellerName">Meno a priezvisko *</Label>
                  <Input
                    id="sellerName"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Ján Novák"
                    data-testid="input-seller-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerIdNumber">Rodné číslo *</Label>
                  <Input
                    id="sellerIdNumber"
                    value={sellerIdNumber}
                    onChange={(e) => setSellerIdNumber(e.target.value)}
                    placeholder="900101/1234"
                    data-testid="input-seller-id"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerAddress">Trvalé bydlisko *</Label>
                <Input
                  id="sellerAddress"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  placeholder="Hlavná 123, 811 01 Bratislava"
                  data-testid="input-seller-address"
                />
              </div>
            </div>

            {/* Buyer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Údaje kupujúceho</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buyerName">Meno a priezvisko *</Label>
                  <Input
                    id="buyerName"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Peter Kováč"
                    data-testid="input-buyer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerIdNumber">Rodné číslo *</Label>
                  <Input
                    id="buyerIdNumber"
                    value={buyerIdNumber}
                    onChange={(e) => setBuyerIdNumber(e.target.value)}
                    placeholder="850505/5678"
                    data-testid="input-buyer-id"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerAddress">Trvalé bydlisko *</Label>
                <Input
                  id="buyerAddress"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Vysoká 456, 821 09 Bratislava"
                  data-testid="input-buyer-address"
                />
              </div>
            </div>

            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Údaje o nehnuteľnosti</h3>
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Adresa nehnuteľnosti *</Label>
                <Input
                  id="propertyAddress"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="Slnečná 15, 811 02 Bratislava"
                  data-testid="input-property-address"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Typ nehnuteľnosti *</Label>
                  <Input
                    id="propertyType"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    placeholder="3-izbový byt"
                    data-testid="input-property-type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertySize">Podlahová plocha (m²) *</Label>
                  <Input
                    id="propertySize"
                    type="number"
                    value={propertySize}
                    onChange={(e) => setPropertySize(e.target.value)}
                    placeholder="78"
                    data-testid="input-property-size"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cadastralArea">Katastrálne územie</Label>
                  <Input
                    id="cadastralArea"
                    value={cadastralArea}
                    onChange={(e) => setCadastralArea(e.target.value)}
                    placeholder="Bratislava - Staré Mesto"
                    data-testid="input-cadastral-area"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landRegistryNumber">Číslo listu vlastníctva</Label>
                  <Input
                    id="landRegistryNumber"
                    value={landRegistryNumber}
                    onChange={(e) => setLandRegistryNumber(e.target.value)}
                    placeholder="1234"
                    data-testid="input-land-registry"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelNumber">Parcelné číslo</Label>
                <Input
                  id="parcelNumber"
                  value={parcelNumber}
                  onChange={(e) => setParcelNumber(e.target.value)}
                  placeholder="5678/12"
                  data-testid="input-parcel-number"
                />
              </div>
            </div>

            {/* Contract Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Podmienky zmluvy</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Kúpna cena (€) *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="185000"
                    data-testid="input-purchase-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Spôsob platby *</Label>
                  <Input
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Bankový prevod"
                    data-testid="input-payment-method"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoverDate">Dátum odovzdania nehnuteľnosti</Label>
                <Input
                  id="handoverDate"
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  data-testid="input-handover-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalTerms">Dodatočné podmienky</Label>
                <Textarea
                  id="additionalTerms"
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  placeholder="Napr. súhlas s hypotékou, podmienky úhrady, ..."
                  rows={4}
                  data-testid="input-additional-terms"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/create-document')}
                data-testid="button-cancel"
              >
                Zrušiť
              </Button>
              <Button
                type="submit"
                disabled={createContractMutation.isPending}
                data-testid="button-save"
              >
                {createContractMutation.isPending ? "Ukladám..." : "Uložiť zmluvu"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
