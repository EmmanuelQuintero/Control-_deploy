import { useState, useEffect, useCallback } from "react";
import { Activity, Footprints, Apple, Moon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ProgressRing } from "@/components/progress-ring";
import { ActivityLog } from "@/components/activity-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id_usuario ?? user?.id;
  const [dailySteps, setDailySteps] = useState<number>(0);
  const [previousSteps, setPreviousSteps] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  // Leer meta de pasos desde localStorage (mismo que en exercise.tsx)
  const [stepsGoal, setStepsGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`steps-goal-${userId}`);
    return saved ? parseInt(saved) : 10000;
  });
  
  // Leer meta de calorías desde localStorage
  const [caloriesGoal, setCaloriesGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`calories-goal-${userId}`);
    return saved ? parseInt(saved) : 2000;
  });
  
  // Leer meta de sueño desde localStorage
  const [sleepGoal, setSleepGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`sleep-goal-${userId}`);
    return saved ? parseFloat(saved) : 8;
  });
  // Helpers de zona horaria (Bogotá)
  const TZ = 'America/Bogota';

  const ymdInTZ = (date: Date): string => {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return f.format(date); // YYYY-MM-DD
  };

  const prevYMD = (ymd: string): string => {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() - 1);
    return ymdInTZ(dt);
  };

  const normalizeDate = (d: any): string => {
    try {
      if (typeof d === 'string') return d.slice(0, 10);
      return ymdInTZ(new Date(d));
    } catch {
      return '';
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "";
    const recYMD = normalizeDate(dateInput);
    const todayYMD = ymdInTZ(new Date());
    const yesterdayYMD = prevYMD(todayYMD);
    if (recYMD === todayYMD) return "Hoy";
    if (recYMD === yesterdayYMD) return "Ayer";
    // Para mostrar DD MMM consistente, crear una fecha segura y formatear en TZ
    const d = new Date(recYMD + 'T12:00:00Z');
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: TZ }).format(d);
  };

  const calculateTrend = () => {
    if (previousSteps === 0) return { trend: undefined as undefined | 'up' | 'down', trendValue: "" };
    const change = ((dailySteps - previousSteps) / previousSteps) * 100;
    const trend = change >= 0 ? "up" : "down" as const;
    const trendValue = `${Math.abs(change).toFixed(0)}% desde ayer`;
    return { trend, trendValue };
  };

  const calculateDailyProgress = () => {
    const stepsProgress = Math.min((dailySteps / stepsGoal) * 100, 100);
    const caloriesProgress = Math.min((calories / caloriesGoal) * 100, 100);
    const sleepProgress = Math.min((sleepHours / sleepGoal) * 100, 100);
    return Math.round((stepsProgress + caloriesProgress + sleepProgress) / 3);
  };

  // Formatear horas: 7 -> "7", 7.5 -> "7.5"
  const formatHours = (h: number) => {
    if (!isFinite(h)) return "0";
    const rounded1 = Math.round(h * 10) / 10;
    return Number.isInteger(rounded1) ? `${Math.trunc(rounded1)}` : `${rounded1.toFixed(1)}`;
  };

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      if (!userId) return;
      const activities: any[] = [];

      // Activity
      const activityRes = await fetch(`/api/activity/${userId}`, { cache: 'no-store' });
      const activityData = await activityRes.json();
      if (activityData.success && Array.isArray(activityData.actividades) && activityData.actividades.length > 0) {
        const today = activityData.actividades[0];
        setDailySteps(today.pasos || 0);
        if (activityData.actividades.length > 1) {
          const yesterday = activityData.actividades[1];
          setPreviousSteps(yesterday.pasos || 0);
        }
        if ((today.pasos ?? 0) > 0) {
          activities.push({
            id: `activity-${normalizeDate(today.fecha)}`,
            type: "Actividad Física",
            description: `${Number(today.pasos).toLocaleString()} pasos · ${today.duracion_minutos ?? 0} min`,
            time: formatDate(today.fecha),
            icon: Activity,
            color: "success" as const,
          });
        }
      }

      // Nutrition
      const nutritionRes = await fetch(`/api/nutrition/${userId}`, { cache: 'no-store' });
      const nutritionData = await nutritionRes.json();
      if (nutritionData.success && Array.isArray(nutritionData.alimentacion) && nutritionData.alimentacion.length > 0) {
        const latestDate = normalizeDate(nutritionData.alimentacion[0].fecha);
        const todayMeals = nutritionData.alimentacion.filter((m: any) => normalizeDate(m.fecha) === latestDate);
        const totalCalories = todayMeals.reduce((sum: number, m: any) => sum + (parseFloat(m.calorias) || 0), 0);
        setCalories(Math.round(totalCalories));
        const latestMeal = nutritionData.alimentacion[0];
        if (latestMeal) {
          activities.push({
            id: `nutrition-${normalizeDate(latestMeal.fecha)}`,
            type: latestMeal.comida || "Comida",
            description: `${latestMeal.descripcion || 'Alimento'} - ${Math.round(parseFloat(latestMeal.calorias || 0))} cal`,
            time: formatDate(latestMeal.fecha),
            icon: Apple,
            color: "nutrition" as const,
          });
        }
      }

      // Sleep - usar registro de ayer
      const sleepRes = await fetch(`/api/sleep/${userId}`, { cache: 'no-store' });
      const sleepData = await sleepRes.json();
      if (sleepData.success && Array.isArray(sleepData.sueno) && sleepData.sueno.length > 0) {
        // Buscar el registro de ayer para "Horas de Sueño" en TZ Bogotá
        const todayYMD = ymdInTZ(new Date());
        const yesterdayStr = prevYMD(todayYMD);
        const yesterdaySleep = sleepData.sueno.find((s: any) => normalizeDate(s.fecha) === yesterdayStr);
        
        if (yesterdaySleep) {
          setSleepHours(parseFloat(yesterdaySleep.horas_dormidas) || 0);
        } else {
          setSleepHours(0);
        }
        
  // Para actividad reciente, mostrar el más reciente NO futuro (fecha <= hoy en TZ Bogotá)
  const todayStr = ymdInTZ(new Date());
  const latestSleep = sleepData.sueno.find((s: any) => normalizeDate(s.fecha) <= todayStr) || sleepData.sueno[0];
        const hours = parseFloat(latestSleep.horas_dormidas) || 0;
        const goal = sleepGoal;
        
        // Calcular calidad basada en horas vs meta
        let quality = "Sin registro";
        if (hours > 0) {
          if (hours >= goal) {
            quality = "Excelente";
          } else if (hours >= goal * 0.85) {
            quality = "Buena";
          } else if (hours >= goal * 0.65) {
            quality = "Regular";
          } else {
            quality = "Mala";
          }
        }
        
        activities.push({
          id: `sleep-${normalizeDate(latestSleep.fecha)}`,
          type: "Sueño",
          description: `${formatHours(hours)} horas - ${quality}`,
          time: formatDate(latestSleep.fecha),
          icon: Moon,
          color: "sleep" as const,
        });
      }

      setRecentActivities(activities);
    } catch (err) {
      console.error('Error obteniendo datos de salud', err);
    } finally {
      setLoading(false);
    }
  }, [userId, dailySteps, previousSteps, calories, sleepHours]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  useEffect(() => {
    const handler = () => fetchHealthData();
    window.addEventListener('health-data-updated', handler);
    return () => window.removeEventListener('health-data-updated', handler);
  }, [fetchHealthData]);

  // Escuchar cambios en la meta de pasos
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`steps-goal-${userId}`);
      if (saved) {
        setStepsGoal(parseInt(saved));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('steps-goal-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('steps-goal-updated', handleStorageChange);
    };
  }, [userId]);

  // Escuchar cambios en la meta de calorías
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`calories-goal-${userId}`);
      if (saved) {
        setCaloriesGoal(parseInt(saved));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('calories-goal-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calories-goal-updated', handleStorageChange);
    };
  }, [userId]);

  // Escuchar cambios en la meta de sueño
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`sleep-goal-${userId}`);
      if (saved) {
        setSleepGoal(parseFloat(saved));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sleep-goal-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sleep-goal-updated', handleStorageChange);
    };
  }, [userId]);

  const calc = calculateTrend();
  const trend = calc.trend as undefined | 'up' | 'down';
  const trendValue = calc.trendValue;
  const dailyProgress = calculateDailyProgress();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your wellness journey</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Pasos Diarios"
          value={loading ? "..." : dailySteps.toLocaleString()}
          icon={Footprints}
          subtitle={`Meta: ${stepsGoal.toLocaleString()}`}
          trend={trend}
          trendValue={trendValue}
          color="success"
        />
        <StatCard
          title="Calorías"
          value={loading ? "..." : calories.toLocaleString()}
          icon={Apple}
          subtitle={`Meta: ${caloriesGoal.toLocaleString()}`}
          color="nutrition"
        />
        <StatCard
          title="Horas de Sueño"
          value={loading ? "..." : `${formatHours(sleepHours)}h`}
          icon={Moon}
          subtitle={`Meta: ${sleepGoal}h`}
          color="sleep"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-goals-progress">
          <CardHeader>
            <CardTitle>Metas del Día</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <ProgressRing progress={dailyProgress} size={180}>
              <div className="text-center">
                <div className="text-4xl font-bold">{dailyProgress}%</div>
                <div className="text-sm text-muted-foreground">Completado</div>
              </div>
            </ProgressRing>
          </CardContent>
        </Card>

        <ActivityLog activities={recentActivities} title="Actividad reciente" />
      </div>
    </div>
  );
}
