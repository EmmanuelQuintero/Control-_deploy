import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNotificationsPoller } from "@/hooks/use-notifications-poller";
import { NotificationBell } from "@/components/notification-bell";
import NotificationsPage from "@/pages/notifications";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Exercise from "@/pages/exercise";
import Nutrition from "@/pages/nutrition";
import Sleep from "@/pages/sleep";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminNotifications from "@/pages/admin-notifications";
import NotFound from "@/pages/not-found";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  useNotificationsPoller(user?.id ?? user?.id_usuario);
  const reduceMotion = useReducedMotion();

  // Redirigir automáticamente a admin dashboard si es admin y está en rutas de usuario
  React.useEffect(() => {
    if (isAuthenticated && isAdmin) {
      // Si está en rutas de usuario, redirigir al admin
      if (location === '/' || location === '/dashboard' || location === '/exercise' || 
          location === '/nutrition' || location === '/sleep' || location === '/profile') {
        setLocation('/admin');
      }
    }
  }, [isAuthenticated, isAdmin, location, setLocation]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Bienvenido, {user?.nombre} {user?.apellido} 
                {isAdmin && <span className="text-amber-600 font-medium"> (Admin)</span>}
              </span>
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                data-testid="button-logout"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/exercise" component={Exercise} />
                  <Route path="/nutrition" component={Nutrition} />
                  <Route path="/sleep" component={Sleep} />
                  <Route path="/profile" component={Profile} />
                  <Route path="/notifications" component={NotificationsPage} />
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/notifications" component={AdminNotifications} />
                  <Route path="/admin/settings" component={AdminDashboard} />
                  <Route component={NotFound} />
                </Switch>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
