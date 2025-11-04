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
import { Home } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreateRentalContract() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();

  // Landlord information
  const [landlordName, setLandlordName] = useState('Petra Ambroz');
  const [landlordAddress, setLandlordAddress] = useState('Hlavná 25, 811 01 Bratislava, Slovensko');
  const [landlordIdNumber, setLandlordIdNumber] = useState('920308/5678');

  // Tenant information
  const [tenantName, setTenantName] = useState('Andres Elgueta');
  const [tenantAddress, setTenantAddress] = useState('Avenida Providencia 1234, Santiago, Chile');
  const [tenantIdNumber, setTenantIdNumber] = useState('24.567.890-1');

  // Property information
  const [propertyAddress, setPropertyAddress] = useState('Dunajská 15, 811 08 Bratislava');
  const [propertyType, setPropertyType] = useState('2-izbový byt');
  const [propertySize, setPropertySize] = useState('65');
  const [propertyRooms, setPropertyRooms] = useState('2');

  // Rental details
  const [monthlyRent, setMonthlyRent] = useState('850');
  const [deposit, setDeposit] = useState('1700');
  const [rentStartDate, setRentStartDate] = useState('');
  const [rentDuration, setRentDuration] = useState('Na dobu neurčitú');
  const [additionalTerms, setAdditionalTerms] = useState('');

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const contractContent = {
        landlord: {
          name: landlordName,
          birthNumber: landlordIdNumber,
          address: landlordAddress,
        },
        tenant: {
          name: tenantName,
          birthNumber: tenantIdNumber,
          address: tenantAddress,
        },
        property: {
          address: propertyAddress,
          type: propertyType,
          floorArea: propertySize,
          rooms: propertyRooms,
        },
        rent: monthlyRent,
        deposit: deposit,
        startDate: rentStartDate,
        endDate: rentDuration,
        additionalTerms: additionalTerms || 'Žiadne dodatočné podmienky',
        signingPlace: 'Bratislava',
        signingDate: new Date().toLocaleDateString('sk-SK'),
      };

      const title = `Nájomná zmluva - ${propertyAddress}`;
      
      return await apiRequest('POST', '/api/contracts', {
        title,
        type: 'rental',
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
    if (!landlordName || !tenantName || !propertyAddress || !monthlyRent) {
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
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Nájomná zmluva</h2>
              <p className="text-muted-foreground">Štandardná slovenská zmluva o nájme</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Landlord Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Prenajímateľ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="landlord-name">Meno a priezvisko *</Label>
                  <Input
                    id="landlord-name"
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="Ján Novák"
                    data-testid="input-landlord-name"
                  />
                </div>
                <div>
                  <Label htmlFor="landlord-id">Rodné číslo *</Label>
                  <Input
                    id="landlord-id"
                    value={landlordIdNumber}
                    onChange={(e) => setLandlordIdNumber(e.target.value)}
                    placeholder="700101/1234"
                    data-testid="input-landlord-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="landlord-address">Bydlisko *</Label>
                  <Input
                    id="landlord-address"
                    value={landlordAddress}
                    onChange={(e) => setLandlordAddress(e.target.value)}
                    placeholder="Hlavná 123, 811 01 Bratislava"
                    data-testid="input-landlord-address"
                  />
                </div>
              </div>
            </div>

            {/* Tenant Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Nájomca</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenant-name">Meno a priezvisko *</Label>
                  <Input
                    id="tenant-name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Peter Kováč"
                    data-testid="input-tenant-name"
                  />
                </div>
                <div>
                  <Label htmlFor="tenant-id">Rodné číslo *</Label>
                  <Input
                    id="tenant-id"
                    value={tenantIdNumber}
                    onChange={(e) => setTenantIdNumber(e.target.value)}
                    placeholder="800505/5678"
                    data-testid="input-tenant-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="tenant-address">Bydlisko *</Label>
                  <Input
                    id="tenant-address"
                    value={tenantAddress}
                    onChange={(e) => setTenantAddress(e.target.value)}
                    placeholder="Vysoká 456, 821 09 Bratislava"
                    data-testid="input-tenant-address"
                  />
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Údaje o nehnuteľnosti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="property-address">Adresa nehnuteľnosti *</Label>
                  <Input
                    id="property-address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="Janka Kráľa 15, 811 05 Bratislava"
                    data-testid="input-property-address"
                  />
                </div>
                <div>
                  <Label htmlFor="property-type">Typ nehnuteľnosti</Label>
                  <Input
                    id="property-type"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    placeholder="2-izbový byt"
                    data-testid="input-property-type"
                  />
                </div>
                <div>
                  <Label htmlFor="property-size">Výmera (m²)</Label>
                  <Input
                    id="property-size"
                    value={propertySize}
                    onChange={(e) => setPropertySize(e.target.value)}
                    placeholder="55"
                    data-testid="input-property-size"
                  />
                </div>
                <div>
                  <Label htmlFor="property-rooms">Počet izieb</Label>
                  <Input
                    id="property-rooms"
                    value={propertyRooms}
                    onChange={(e) => setPropertyRooms(e.target.value)}
                    placeholder="2"
                    data-testid="input-property-rooms"
                  />
                </div>
              </div>
            </div>

            {/* Rental Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Podmienky nájmu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly-rent">Mesačné nájomné (€) *</Label>
                  <Input
                    id="monthly-rent"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    placeholder="650"
                    data-testid="input-monthly-rent"
                  />
                </div>
                <div>
                  <Label htmlFor="deposit">Kaucia (€)</Label>
                  <Input
                    id="deposit"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="1300"
                    data-testid="input-deposit"
                  />
                </div>
                <div>
                  <Label htmlFor="rent-start">Dátum začiatku nájmu</Label>
                  <Input
                    id="rent-start"
                    type="date"
                    value={rentStartDate}
                    onChange={(e) => setRentStartDate(e.target.value)}
                    data-testid="input-rent-start"
                  />
                </div>
                <div>
                  <Label htmlFor="rent-duration">Doba nájmu</Label>
                  <Input
                    id="rent-duration"
                    value={rentDuration}
                    onChange={(e) => setRentDuration(e.target.value)}
                    placeholder="Na dobu neurčitú / 1 rok"
                    data-testid="input-rent-duration"
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
                placeholder="Napríklad: V nájomnom je zahrnuté užívanie pivničných priestorov..."
                rows={4}
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
