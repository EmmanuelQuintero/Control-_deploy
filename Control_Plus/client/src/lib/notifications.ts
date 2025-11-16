import { useEffect, useState } from 'react';

export type NotificationType = 'actividad' | 'sueno' | 'alimentacion' | 'general';

export interface Notification {
  id_notificacion: number;
  id_usuario: number;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  fecha_creacion: string; // ISO
  leida: 0 | 1;
}

export async function fetchNotifications(userId: number, since?: string): Promise<Notification[]> {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`/api/notifications/${userId}${params}`);
  const data = await res.json();
  if (data?.success && Array.isArray(data.notifications)) {
    return data.notifications as Notification[];
  }
  return [];
}

export async function markNotificationsRead(userId: number, ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const res = await fetch(`/api/notifications/${userId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  return data?.success ? (data.count as number) : 0;
}

export function useNotificationsList(userId?: number) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchNotifications(userId);
      setItems(list);
    } catch (e) {
      setError('No se pudo cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // refrescar cada 60s para mantener el badge razonablemente actualizado
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unreadCount = items.filter(n => !n.leida).length;

  const markAllRead = async () => {
    if (!userId) return 0;
    const ids = items.filter(n => !n.leida).map(n => n.id_notificacion);
    const count = await markNotificationsRead(userId, ids);
    if (count) {
      // actualizar estado local
      setItems(prev => prev.map(n => ids.includes(n.id_notificacion) ? { ...n, leida: 1 } : n));
    }
    return count;
  };

  const markOneRead = async (id: number) => {
    if (!userId) return 0;
    const count = await markNotificationsRead(userId, [id]);
    if (count) setItems(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: 1 } : n));
    return count;
  };

  return { items, loading, error, unreadCount, refresh, markAllRead, markOneRead };
}

export function formatDateTime(dt: string) {
  try {
    const d = new Date(dt);
    // Usar la zona horaria local del navegador para evitar desfases percibidos por el usuario
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'es';

    // Calcular ymd en la misma zona para decidir Hoy/Ayer
    const fmtYMD = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const ymd = fmtYMD.format(d);
    const ymdToday = fmtYMD.format(new Date());
    const ymdYesterday = fmtYMD.format(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const isToday = ymd === ymdToday;
    const isYesterday = ymd === ymdYesterday;

    const dateLabel = (isToday || isYesterday)
      ? (isToday ? 'Hoy' : 'Ayer')
      : new Intl.DateTimeFormat(locale, {
          timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(d);

    const timeLabel = new Intl.DateTimeFormat(locale, {
      timeZone: tz, hour: '2-digit', minute: '2-digit'
    }).format(d);

    return (isToday || isYesterday) ? `${dateLabel} ${timeLabel}` : `${dateLabel}, ${timeLabel}`;
  } catch {
    return dt;
  }
}
