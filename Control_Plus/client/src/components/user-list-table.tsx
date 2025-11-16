import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface BasicUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  role: 'Usuario' | 'Admin';
}

export function UserListTable() {
  const { toast } = useToast();
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.message || 'Error');
          toast({ title: 'Error', description: data.message || 'No se pudieron cargar los usuarios', variant: 'destructive' });
        }
      } catch (e) {
        if (!cancelled) {
          setError('Error de conexión');
          toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [toast]);

  return (
    <Card data-testid="card-user-list">
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && !loading && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id_usuario} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-medium">{u.nombre} {u.apellido}</td>
                  <td className="py-2 pr-2">{u.email}</td>
                  <td className="py-2 pr-2 text-xs"><span className="inline-block rounded bg-muted px-2 py-0.5">{u.role}</span></td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">Sin usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
