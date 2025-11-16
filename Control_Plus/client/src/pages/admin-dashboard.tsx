import { Users, Activity, TrendingUp, Bell } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { UserListTable } from "@/components/user-list-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
            setUsersCount(data.usersCount);
          } else {
            toast({ title: 'Error', description: data.message || 'No se pudieron cargar las estadísticas', variant: 'destructive' });
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast({ title: 'Error', description: 'Error al conectar con el servidor', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };
    loadStats();
    return () => { cancelled = true; };
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitoreo de usuarios</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Total Users"
          value={loadingStats ? '…' : (usersCount ?? 0).toString()}
          icon={Users}
          color="primary"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <UserListTable />
      </div>

      <Card data-testid="card-engagement-stats">
        <CardHeader>
          <CardTitle>User Engagement Trends</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
