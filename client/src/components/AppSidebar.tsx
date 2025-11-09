import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Home,
  FileText,
  FolderOpen,
  User,
  Building2,
  Users,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  ClipboardList,
  Briefcase,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Mandate {
  mandateId: string;
  ico: string;
  companyName: string;
  role: string;
}

interface CurrentUserResponse {
  user: User;
  mandates: Mandate[];
  activeContext: string | null;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
}

// Navigation items for personal profile
const personalNavItems: NavItem[] = [
  {
    label: "Domov",
    icon: Home,
    path: "/",
  },
  {
    label: "Moje dokumenty",
    icon: FolderOpen,
    path: "/my-documents",
  },
  // POLOŽKA "Moje zmluvy" BOLA ÚMYSLNE ODSTRÁNENÁ Z OSOBNÉHO PROFILU
];

// Navigation items for company profile
const companyNavItems: NavItem[] = [
  {
    label: "Domov",
    icon: Home,
    path: "/",
  },
  {
    label: "Firemné dokumenty",
    icon: FileText,
    path: "/moje-zmluvy",
  },
  {
    label: "E-dokumenty",
    icon: ShieldCheck,
    path: "/e-documents",
  },
  {
    label: "Virtuálna kancelária",
    icon: Briefcase,
    path: "/virtual-office",
  },
  {
    label: "Správa firmy",
    icon: Building2,
    path: "/companies",
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const { data, isLoading } = useQuery<CurrentUserResponse>({
    queryKey: ['/api/current-user'],
    retry: false,
  });

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">
            Načítavam navigáciu...
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  if (!data?.user) {
    return null;
  }

  const activeContext = data.activeContext;
  const isCompanyContext = activeContext && activeContext !== 'personal';
  
  // Find active company by mandate ID
  const activeCompany = isCompanyContext
    ? data.mandates.find(m => m.mandateId === activeContext)
    : null;

  // Select appropriate nav items based on context
  const navItems = isCompanyContext ? companyNavItems : personalNavItems;
  const contextLabel = isCompanyContext
    ? activeCompany?.companyName || "Firemný profil"
    : "Osobný profil";

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center space-x-3">
          {isCompanyContext ? (
            <Building2 className="w-5 h-5 text-primary" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{contextLabel}</p>
            {isCompanyContext && activeCompany && (
              <p className="text-xs text-muted-foreground">IČO: {activeCompany.ico}</p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigácia</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.path)}
                      isActive={isActive}
                      data-testid={`sidebar-nav-${item.path}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">{data.user.name}</p>
          <p className="truncate">{data.user.email}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
