import { Activity, Apple, Moon as Sleep, User, LayoutDashboard, Bell, Settings } from "lucide-react";
import { Link } from "wouter";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const userItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ejercicio",
    url: "/exercise",
    icon: Activity,
  },
  {
    title: "Nutrición",
    url: "/nutrition",
    icon: Apple,
  },
  {
    title: "Sueño",
    url: "/sleep",
    icon: Sleep,
  },
  {
    title: "Notificaciones",
    url: "/notifications",
    icon: Bell,
  },
  {
    title: "Perfil",
    url: "/profile",
    icon: User,
  },
];

const adminItems = [
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

interface AppSidebarProps {
  isAdmin?: boolean;
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const items = isAdmin ? adminItems : userItems;
  const { user } = useAuth();
  const fullName = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() : '';
  const initials = fullName
    ? fullName.split(/\s+/).map(p => p[0]).join('').slice(0,2).toUpperCase()
    : (user?.nombre?.[0] || 'U').toUpperCase();
  
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">C+</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Control+</h2>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Admin Menu" : "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{fullName || user?.email || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || '—'}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
