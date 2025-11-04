import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import { Check, Clock } from "lucide-react";

type ProcessType = 'house' | 'vehicle' | 'attorney';

interface StepDefinition {
  label: string;
}

export default function DigitalSigning() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const processType = (params.type || 'house') as ProcessType;
  const [currentStep, setCurrentStep] = useState(1);

  const getProcessSteps = (): StepDefinition[] => {
    switch(processType) {
      case 'house':
        return [
          { label: 'Podpis zmluvy' },
          { label: 'Escrow' },
          { label: 'Zaslanie na kataster' },
          { label: 'Vybavenie prevodu' },
          { label: 'Dokončené' }
        ];
      case 'vehicle':
        return [
          { label: 'Podpis zmluvy' },
          { label: 'Platba' },
          { label: 'Podanie na úrad' },
          { label: 'Registrácia' },
          { label: 'Notárska zápisnica' },
          { label: 'Archivácia' },
          { label: 'Dokončené' }
        ];
      case 'attorney':
        return [
          { label: 'Podpis' },
          { label: 'Overenie' },
          { label: 'Dokončené' }
        ];
      default:
        return [
          { label: 'Podpis zmluvy' },
          { label: 'Dokončené' }
        ];
    }
  };

  const getProcessInfo = () => {
    switch(processType) {
      case 'house':
        return {
          title: 'Kúpno-predajná zmluva - Rodinný dom',
          seller: 'Ján Novák',
          buyer: 'Mária Svobodová',
          subject: 'Rodinný dom, Bratislava',
          price: '250 000 €',
          created: '20.12.2024'
        };
      case 'vehicle':
        return {
          title: 'Predaj vozidla - Škoda Octavia',
          seller: 'Ján Novák',
          buyer: 'Tomáš Horváth',
          subject: 'Škoda Octavia 2019, 85 000 km',
          price: '18 500 €',
          created: '22.12.2024'
        };
      case 'attorney':
        return {
          title: 'Splnomocnenie - Zastupovanie na úrade',
          seller: 'Ján Novák',
          buyer: 'Peter Kováč',
          subject: 'Zastupovanie na katastrálnom úrade',
          price: '-',
          created: '21.12.2024'
        };
      default:
        return {
          title: 'Digitálne podpisovanie',
          seller: '-',
          buyer: '-',
          subject: '-',
          price: '-',
          created: '-'
        };
    }
  };

  const steps = getProcessSteps();
  const info = getProcessInfo();

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
    }
  };

  const getStepActionContent = () => {
    if (currentStep === 1) {
      return {
        message: 'Čakáme na podpis druhej strany...',
        buttonText: 'Simulovať podpis druhej strany'
      };
    } else if (currentStep === 2 && processType === 'house') {
      return {
        message: 'Inicializácia Escrow služby pre bezpečný prevod finančných prostriedkov...',
        buttonText: 'Potvrdiť Escrow',
        details: (
          <div className="bg-primary/10 p-4 rounded-lg mb-4">
            <p className="text-sm text-primary"><strong>Suma:</strong> {info.price} + 50 € (poplatok DN)</p>
            <p className="text-sm text-primary"><strong>Celkom:</strong> {parseInt(info.price.replace(/[^\d]/g, '')) + 50} €</p>
          </div>
        )
      };
    } else if (currentStep === 2 && processType === 'vehicle') {
      return {
        message: 'Inicializácia platby cez Escrow službu...',
        buttonText: 'Potvrdiť platbu',
        details: (
          <div className="bg-primary/10 p-4 rounded-lg mb-4">
            <p className="text-sm text-primary"><strong>Suma:</strong> {info.price} + 35 € (poplatok DN)</p>
            <p className="text-sm text-primary"><strong>Celkom:</strong> {parseInt(info.price.replace(/[^\d]/g, '')) + 35} €</p>
          </div>
        )
      };
    } else if (currentStep === 2 && processType === 'attorney') {
      return {
        message: 'Overenie splnomocnenia...',
        buttonText: 'Dokončiť overenie'
      };
    } else if (currentStep === 3 && processType === 'house') {
      return {
        message: 'Automatické zaslanie dokumentov na katastrálny úrad...',
        buttonText: 'Potvrdiť zaslanie na kataster'
      };
    } else if (currentStep === 3 && processType === 'vehicle') {
      return {
        message: 'Automatické podanie na Okresný úrad - odbor dopravy...',
        buttonText: 'Potvrdiť podanie'
      };
    } else if (currentStep === 4 && processType === 'house') {
      return {
        message: 'Vybavovanie prevodu vlastníctva...',
        buttonText: 'Dokončiť prevod'
      };
    } else if (currentStep === 4 && processType === 'vehicle') {
      return {
        message: 'Spracovanie registrácie zmeny držiteľa vozidla...',
        buttonText: 'Dokončiť registráciu'
      };
    } else if (currentStep === 5 && processType === 'vehicle') {
      return {
        message: 'Vytvorenie notárskej zápisnice...',
        buttonText: 'Vytvoriť zápisnicu'
      };
    } else if (currentStep === 6 && processType === 'vehicle') {
      return {
        message: 'Archivácia dokumentov do EUDI peňaženky a DN archívu...',
        buttonText: 'Dokončiť archiváciu'
      };
    }
    return null;
  };

  const actionContent = getStepActionContent();
  const isCompleted = currentStep === steps.length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <BackButton onClick={() => setLocation('/virtual-office')} />
          <h2 className="text-2xl font-semibold mb-6">Digitálne podpisovanie zmluvy</h2>

          {/* Progress Timeline */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Priebeh procesu</h3>
              <span className="text-sm text-muted-foreground">
                Krok {currentStep} z {steps.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStep - 1
                      ? 'bg-chart-2 text-primary-foreground' 
                      : index === currentStep - 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep - 1 ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 ${
                      index < currentStep - 1 ? 'bg-chart-2' : index === currentStep - 1 ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center mt-2 space-x-2">
              {steps.map((step, index) => (
                <div key={index} className="flex-1">
                  <p className="text-xs text-muted-foreground text-center">{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Status */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Stav zmluvy: {info.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-chart-2/30 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-chart-2" />
                    </div>
                    <div>
                      <p className="font-medium">{info.seller} (Predávajúci)</p>
                      <p className="text-sm text-muted-foreground">Podpísané: {info.created} 14:30</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-chart-2/20 text-chart-2 rounded-full text-sm">Podpísané</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep > 1 ? 'bg-chart-2/30' : 'bg-yellow-100 dark:bg-yellow-900'
                    }`}>
                      {currentStep > 1 ? (
                        <Check className="h-4 w-4 text-chart-2" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-200" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{info.buyer} (Kupujúci)</p>
                      <p className="text-sm text-muted-foreground">
                        {currentStep > 1 ? `Podpísané: ${info.created} 15:45` : 'Čaká na podpis'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    currentStep > 1 
                      ? 'bg-chart-2/20 text-chart-2' 
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {currentStep > 1 ? 'Podpísané' : 'Čaká'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">Detaily zmluvy</h4>
                  <div className="text-sm text-primary/80 space-y-1">
                    <p><strong>Predmet:</strong> {info.subject}</p>
                    <p><strong>Kúpna cena:</strong> {info.price}</p>
                    <p><strong>Vytvorené:</strong> {info.created}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="p-6">
            {!isCompleted && actionContent ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">{actionContent.message}</p>
                {actionContent.details}
                <Button onClick={handleNextStep} data-testid={`button-step-${currentStep}`}>
                  {actionContent.buttonText}
                </Button>
              </div>
            ) : isCompleted ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-chart-2/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-chart-2" />
                </div>
                <h3 className="text-xl font-semibold text-chart-2">Proces dokončený!</h3>
                <p className="text-muted-foreground">
                  {processType === 'house' && 'Kúpno-predajná zmluva bola úspešne spracovaná a prevod vlastníctva je dokončený.'}
                  {processType === 'vehicle' && 'Predaj vozidla bol úspešne dokončený. Všetky dokumenty sú archivované v EUDI peňaženke.'}
                  {processType === 'attorney' && 'Splnomocnenie bolo úspešne podpísané a overené.'}
                </p>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2"><strong>Hash dokumentu:</strong></p>
                      <p className="text-xs font-mono bg-background p-2 rounded">SHA256: b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456ab</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2"><strong>Časová pečiatka:</strong></p>
                      <p className="text-xs font-mono bg-background p-2 rounded">2024-12-22T16:15:45.789Z (RFC 3161)</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center mt-6">
                  <Button variant="outline" onClick={() => setLocation('/moje-zmluvy')} data-testid="button-view-contracts">
                    Zobraziť moje zmluvy
                  </Button>
                  <Button onClick={() => setLocation('/virtual-office')} data-testid="button-back-office">
                    Späť do virtuálnej kancelárie
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </Card>
      </div>
    </div>
  );
}
