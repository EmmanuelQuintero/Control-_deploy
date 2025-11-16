import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export function useNotificationsPoller(userId?: number) {
  const lastSeenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const params = lastSeenRef.current ? `?since=${encodeURIComponent(lastSeenRef.current)}` : '';
        const res = await fetch(`/api/notifications/${userId}${params}`);
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.notifications) && data.notifications.length) {
          const ids: number[] = [];
          for (const n of data.notifications) {
            ids.push(n.id_notificacion);
            toast({ title: n.titulo, description: n.mensaje });
          }
          // Actualizar lastSeen al mayor fecha_creacion
          const newest = data.notifications[0];
          if (newest?.fecha_creacion) {
            lastSeenRef.current = new Date(newest.fecha_creacion).toISOString();
          }
          // Marcar como leídas para no repetir
          try {
            await fetch(`/api/notifications/${userId}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            });
          } catch {}
        }
      } catch (e) {
        // Silencioso
      }
    };

    // Primera llamada, listener para disparo manual y luego cada 60s
    poll();
    const onTick = () => { poll(); };
    window.addEventListener('notifications:tick', onTick);
    const id = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener('notifications:tick', onTick);
      clearInterval(id);
    };
  }, [userId]);
}
