import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Apple, Moon, Info, CheckCheck, RefreshCw } from 'lucide-react';
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

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.id_usuario;
  const isAdmin = user?.role === 'Admin';
  const { items, loading, unreadCount, markAllRead, markOneRead, refresh } = useNotificationsList(userId);

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

  const grouped = useMemo(() => {
    const byDate = new Map<string, typeof displayedItems>();
    for (const n of displayedItems) {
      const d = new Date(n.fecha_creacion);
      const key = d.toLocaleDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(n);
    }
    return Array.from(byDate.entries());
  }, [displayedItems]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="default" onClick={handleMarkAllRead} disabled={loading || displayedUnreadCount === 0} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todo leído
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu historial reciente</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="h-[70vh]">
            <div className="divide-y">
              {displayedItems.length === 0 && (
                <div className="px-6 py-12 text-sm text-muted-foreground text-center">Aún no hay notificaciones</div>
              )}
              {grouped.map(([dateLabel, list]) => (
                <div key={dateLabel} className="px-6 py-3">
                  <p className="text-xs text-muted-foreground mb-2">{dateLabel}</p>
                  <div className="space-y-2">
                    {list.map(n => (
                      <div key={n.id_notificacion} className={`flex items-start gap-3 p-3 rounded-md border ${!n.leida ? 'bg-accent/40' : ''}`}>
                        <TypeIcon type={n.tipo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{n.titulo}</p>
                            {!n.leida && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{n.mensaje}</p>
                          <p className="text-[11px] text-muted-foreground/80 mt-1">{formatDateTime(n.fecha_creacion)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
