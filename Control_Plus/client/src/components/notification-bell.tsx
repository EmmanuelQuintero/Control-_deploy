import React from 'react';
import { Bell, CheckCheck, Activity, Apple, Moon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { formatDateTime, useNotificationsList } from '@/lib/notifications';

function TypeIcon({ type }: { type: 'actividad'|'sueno'|'alimentacion'|'general' }) {
  switch (type) {
    case 'actividad':
      return <Activity className="h-4 w-4 text-blue-600" />;
    case 'sueno':
      return <Moon className="h-4 w-4 text-indigo-600" />;
    case 'alimentacion':
      return <Apple className="h-4 w-4 text-emerald-600" />;
    default:
      return <Info className="h-4 w-4 text-amber-600" />;
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.id_usuario;
  const isAdmin = user?.role === 'Admin';
  const { items, unreadCount, loading, markAllRead, markOneRead, refresh } = useNotificationsList(userId);

  // Para admin, solo mostrar notificaciones tipo 'general'
  const displayedItems = isAdmin ? items.filter(n => n.tipo === 'general') : items;
  const displayedUnreadCount = displayedItems.filter(n => !n.leida).length;

  const handleMarkAllRead = async () => {
    if (isAdmin) {
      // Marcar solo las que mostramos
      for (const n of displayedItems.filter(n => !n.leida)) {
        await markOneRead(n.id_notificacion);
      }
    } else {
      await markAllRead();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {displayedUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px] leading-4 rounded-full"
            >
              {displayedUnreadCount > 9 ? '9+' : displayedUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={loading || displayedUnreadCount === 0} onClick={handleMarkAllRead} className="h-7 px-2 gap-1">
              <CheckCheck className="h-4 w-4" />
              <span className="text-xs">Marcar todo leído</span>
            </Button>
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="h-7 px-2">Ver todo</Button>
            </Link>
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-80">
          <div className="py-1">
            {displayedItems.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">No tienes notificaciones</div>
            )}
            {displayedItems.map(n => (
              <div key={n.id_notificacion} className={`px-3 py-2 hover:bg-accent/50 transition-colors ${!n.leida ? 'bg-accent/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <TypeIcon type={n.tipo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{n.titulo}</p>
                      {!n.leida && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">{formatDateTime(n.fecha_creacion)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2">
          <Button variant="outline" className="w-full" onClick={refresh}>Actualizar</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
