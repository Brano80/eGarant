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
import { Briefcase } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreateEmploymentContract() {
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();

  // Employer information
  const [employerName, setEmployerName] = useState('ARIAN s.r.o.');
  const [employerAddress, setEmployerAddress] = useState('Námestie SNP 15, 811 06 Bratislava, Slovensko');
  const [employerIdNumber, setEmployerIdNumber] = useState('47865789');
  const [employerRepresentative, setEmployerRepresentative] = useState('Petra Ambroz, konateľka');

  // Employee information
  const [employeeName, setEmployeeName] = useState('Andres Elgueta');
  const [employeeAddress, setEmployeeAddress] = useState('Avenida Providencia 1234, Santiago, Chile');
  const [employeeIdNumber, setEmployeeIdNumber] = useState('24.567.890-1');

  // Employment details
  const [position, setPosition] = useState('Softvérový vývojár');
  const [startDate, setStartDate] = useState('');
  const [workLocation, setWorkLocation] = useState('Bratislava');
  const [salary, setSalary] = useState('2500');
  const [workHours, setWorkHours] = useState('40 hodín týždenne');
  const [vacationDays, setVacationDays] = useState('25');
  const [additionalTerms, setAdditionalTerms] = useState('');

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const contractContent = {
        employer: {
          name: employerName,
          ico: employerIdNumber,
          address: employerAddress,
          representative: employerRepresentative,
        },
        employee: {
          name: employeeName,
          birthNumber: employeeIdNumber,
          address: employeeAddress,
        },
        employment: {
          position: position,
          startDate: startDate,
          workLocation: workLocation,
          salary: salary,
          workHours: workHours || '40 hodín týždenne',
          vacationDays: vacationDays || '25 dní',
        },
        additionalTerms: additionalTerms || 'Žiadne dodatočné podmienky',
        signingPlace: 'Bratislava',
        signingDate: new Date().toLocaleDateString('sk-SK'),
      };

      const title = `Zamestnanecká zmluva - ${employeeName} - ${position}`;
      
      return await apiRequest('POST', '/api/contracts', {
        title,
        type: 'employment',
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
    if (!employerName || !employeeName || !position || !salary || !startDate) {
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
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Zamestnanecká zmluva</h2>
              <p className="text-muted-foreground">Štandardná slovenská pracovná zmluva</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Employer Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Zamestnávateľ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employer-name">Názov spoločnosti *</Label>
                  <Input
                    id="employer-name"
                    value={employerName}
                    onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="ABC s.r.o."
                    data-testid="input-employer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="employer-id">IČO *</Label>
                  <Input
                    id="employer-id"
                    value={employerIdNumber}
                    onChange={(e) => setEmployerIdNumber(e.target.value)}
                    placeholder="12345678"
                    data-testid="input-employer-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="employer-address">Sídlo spoločnosti *</Label>
                  <Input
                    id="employer-address"
                    value={employerAddress}
                    onChange={(e) => setEmployerAddress(e.target.value)}
                    placeholder="Hlavná 123, 811 01 Bratislava"
                    data-testid="input-employer-address"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="employer-representative">Zastúpený (konateľ, riaditeľ) *</Label>
                  <Input
                    id="employer-representative"
                    value={employerRepresentative}
                    onChange={(e) => setEmployerRepresentative(e.target.value)}
                    placeholder="Mgr. Ján Novák, konateľ"
                    data-testid="input-employer-representative"
                  />
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Zamestnanec</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee-name">Meno a priezvisko *</Label>
                  <Input
                    id="employee-name"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Peter Kováč"
                    data-testid="input-employee-name"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-id">Rodné číslo *</Label>
                  <Input
                    id="employee-id"
                    value={employeeIdNumber}
                    onChange={(e) => setEmployeeIdNumber(e.target.value)}
                    placeholder="850505/5678"
                    data-testid="input-employee-id"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="employee-address">Bydlisko *</Label>
                  <Input
                    id="employee-address"
                    value={employeeAddress}
                    onChange={(e) => setEmployeeAddress(e.target.value)}
                    placeholder="Vysoká 456, 821 09 Bratislava"
                    data-testid="input-employee-address"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Pracovné zaradenie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Pracovná pozícia *</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Softvérový vývojár"
                    data-testid="input-position"
                  />
                </div>
                <div>
                  <Label htmlFor="start-date">Nástup do práce *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="work-location">Miesto výkonu práce *</Label>
                  <Input
                    id="work-location"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="Bratislava"
                    data-testid="input-work-location"
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Hrubá mzda (€) *</Label>
                  <Input
                    id="salary"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="2500"
                    data-testid="input-salary"
                  />
                </div>
                <div>
                  <Label htmlFor="work-hours">Pracovný čas</Label>
                  <Input
                    id="work-hours"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    placeholder="40 hodín týždenne"
                    data-testid="input-work-hours"
                  />
                </div>
                <div>
                  <Label htmlFor="vacation-days">Dovolenka (dni)</Label>
                  <Input
                    id="vacation-days"
                    value={vacationDays}
                    onChange={(e) => setVacationDays(e.target.value)}
                    placeholder="25"
                    data-testid="input-vacation-days"
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
                placeholder="Napríklad: Skúšobná doba 3 mesiace, možnosť home office..."
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
