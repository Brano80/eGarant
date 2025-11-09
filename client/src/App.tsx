import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import PrivateRoute from "@/components/PrivateRoute";
import Navbar from "@/components/Navbar";
import { AppSidebar } from "@/components/AppSidebar";
import Home from "@/pages/Home";
import SelectProfile from "@/pages/SelectProfile";
import SelectCompany from "@/pages/SelectCompany";
import MyDocuments from "@/pages/MyDocuments";
import EDocumentsPage from "@/pages/EDocumentsPage";
import MyContracts from "@/pages/MyContracts";
import CompanyList from "@/pages/CompanyList";
import AddCompanyForm from "@/pages/AddCompanyForm";
import ManageMandatesPage from "@/pages/companies/ManageMandatesPage";
import CompanyProfilePage from "@/pages/companies/CompanyProfilePage";
import CompanySecurityPage from "@/pages/companies/CompanySecurityPage";
import AuditLogPage from "@/pages/companies/AuditLogPage";
import CreateDocument from "@/pages/CreateDocument";
import CreateVehicleContract from "@/pages/CreateVehicleContract";
import CreateRentalContract from "@/pages/CreateRentalContract";
import CreatePropertyContract from "@/pages/CreatePropertyContract";
import CreateUploadDocument from "@/pages/CreateUploadDocument";
import CreatePowerOfAttorney from "@/pages/CreatePowerOfAttorney";
import CreateEmploymentContract from "@/pages/CreateEmploymentContract";
import VerifyDocument from "@/pages/VerifyDocument";
import VirtualOfficeListPage from "@/pages/VirtualOfficeListPage";
import VirtualOfficeDetailPage from "@/pages/VirtualOfficeDetailPage";
import DigitalSigning from "@/pages/DigitalSigning";
import MandateCheckDemo from "@/pages/MandateCheckDemo";
import { ContractListPage } from "./pages/ContractListPage";
import NotFound from "@/pages/not-found";
import { AttestationPage } from './pages/AttestationPage';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/select-profile">
        <PrivateRoute>
          <SelectProfile />
        </PrivateRoute>
      </Route>
      <Route path="/select-company">
        <PrivateRoute>
          <SelectCompany />
        </PrivateRoute>
      </Route>
      <Route path="/my-documents">
        <PrivateRoute>
          <MyDocuments />
        </PrivateRoute>
      </Route>
      <Route path="/e-documents">
        <PrivateRoute>
          <EDocumentsPage />
        </PrivateRoute>
      </Route>
      <Route path="/moje-zmluvy">
        <PrivateRoute>
          <ContractListPage />
        </PrivateRoute>
      </Route>
      <Route path="/companies">
        <PrivateRoute>
          <CompanyList />
        </PrivateRoute>
      </Route>
      <Route path="/companies/add">
        <PrivateRoute>
          <AddCompanyForm />
        </PrivateRoute>
      </Route>
      <Route path="/companies/mandates">
        <PrivateRoute>
          <ManageMandatesPage />
        </PrivateRoute>
      </Route>
      <Route path="/companies/profile">
        <PrivateRoute>
          <CompanyProfilePage />
        </PrivateRoute>
      </Route>
      <Route path="/companies/security">
        <PrivateRoute>
          <CompanySecurityPage />
        </PrivateRoute>
      </Route>
      <Route path="/companies/activity">
        <PrivateRoute>
          <AuditLogPage />
        </PrivateRoute>
      </Route>
      <Route path="/create-document">
        <PrivateRoute>
          <CreateDocument />
        </PrivateRoute>
      </Route>
      <Route path="/create-vehicle-contract">
        <PrivateRoute>
          <CreateVehicleContract />
        </PrivateRoute>
      </Route>
      <Route path="/create-rental-contract">
        <PrivateRoute>
          <CreateRentalContract />
        </PrivateRoute>
      </Route>
      <Route path="/create-property-contract">
        <PrivateRoute>
          <CreatePropertyContract />
        </PrivateRoute>
      </Route>
      <Route path="/create-upload-document">
        <PrivateRoute>
          <CreateUploadDocument />
        </PrivateRoute>
      </Route>
      <Route path="/create-power-of-attorney">
        <PrivateRoute>
          <CreatePowerOfAttorney />
        </PrivateRoute>
      </Route>
      <Route path="/create-employment-contract">
        <PrivateRoute>
          <CreateEmploymentContract />
        </PrivateRoute>
      </Route>
      <Route path="/verify-document">
        <PrivateRoute>
          <VerifyDocument />
        </PrivateRoute>
      </Route>
      <Route path="/virtual-office/:id">
        <PrivateRoute>
          <VirtualOfficeDetailPage />
        </PrivateRoute>
      </Route>
      <Route path="/attestation/:documentId">
        <PrivateRoute>
          <AttestationPage />
        </PrivateRoute>
      </Route>
      <Route path="/virtual-office">
        <PrivateRoute>
          <VirtualOfficeListPage />
        </PrivateRoute>
      </Route>
      
      <Route path="/digital-signing/:type">
        <PrivateRoute>
          <DigitalSigning />
        </PrivateRoute>
      </Route>
      <Route path="/mandate-check-demo">
        <PrivateRoute>
          <MandateCheckDemo />
        </PrivateRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

interface CurrentUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  mandates: Array<{
    ico: string;
    companyName: string;
    role: string;
  }>;
  activeContext: string | null;
}

function AppContent() {
  const [location] = useLocation();
  const { data } = useQuery<CurrentUserResponse>({
    queryKey: ['/api/current-user'],
    retry: false,
  });

  const isAuthenticated = !!data?.user;
  const hasActiveContext = !!data?.activeContext;
  
  // Pages where sidebar should NOT be shown (profile selection pages)
  const noSidebarPages = ['/select-profile', '/select-company'];
  const shouldShowSidebar = isAuthenticated && hasActiveContext && !noSidebarPages.includes(location);

  // Sidebar width customization
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (!isAuthenticated) {
    // No sidebar for unauthenticated users
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Router />
      </div>
    );
  }

  if (!shouldShowSidebar) {
    // Authenticated but no context selected or on profile selection page
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Router />
      </div>
    );
  }

  // Authenticated users with active context get sidebar layout
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
